import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import serverResponse, { unauthorizedResponse } from "@/utils/serverResponse";
import { googleDocsResourceId, taskSubmissionErrorResponse } from "@/utils/taskSubmission";
import { NextRequest } from "next/server";
import { z } from "zod";
import { taskDeadlineGuard } from "@/lib/taskDeadline";

const GoogleDocsUrlSchema = z.string().trim().url("Link Google Docs tidak valid").refine(
  (value) => googleDocsResourceId(value) !== null,
  "Link harus mengarah ke dokumen Google Docs",
);

const SubmissionSchema = z.object({
  first_docs_url: GoogleDocsUrlSchema.optional(),
  second_docs_url: GoogleDocsUrlSchema.optional(),
}).refine(
  (body) => body.first_docs_url !== undefined || body.second_docs_url !== undefined,
  "Minimal satu link Google Docs wajib diisi",
);

async function getUserId(req: NextRequest) {
  try {
    return (await authenticateRequest(req)).userId;
  } catch {
    return null;
  }
}

function serializeSubmission(submission: {
  id: number;
  userId: number;
  firstDocsUrl: string | null;
  secondDocsUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null) {
  if (!submission) return null;

  return {
    id: submission.id,
    userId: submission.userId,
    first_docs_url: submission.firstDocsUrl,
    second_docs_url: submission.secondDocsUrl,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
}

function progressOf(submission: { firstDocsUrl: string | null; secondDocsUrl: string | null } | null) {
  const firstDocumentId = googleDocsResourceId(submission?.firstDocsUrl);
  const secondDocumentId = googleDocsResourceId(submission?.secondDocsUrl);
  const completed = Number(firstDocumentId !== null) + Number(
    secondDocumentId !== null && secondDocumentId !== firstDocumentId,
  );

  return {
    completed,
    required: 2,
    percentage: Math.round((completed / 2) * 100),
  };
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();

  const submission = await prisma.networkingSubmission.findUnique({ where: { userId } });

  return serverResponse({
    success: true,
    message: "Submission Networking berhasil didapatkan",
    data: {
      submission: serializeSubmission(submission),
      progress: progressOf(submission),
    },
    status: 200,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return unauthorizedResponse();

  const deadlineResponse = taskDeadlineGuard("networking");
  if (deadlineResponse) return deadlineResponse;

  try {
    const body = SubmissionSchema.parse(await req.json());
    const current = await prisma.networkingSubmission.findUnique({ where: { userId } });
    const firstDocsUrl = body.first_docs_url ?? current?.firstDocsUrl ?? null;
    const secondDocsUrl = body.second_docs_url ?? current?.secondDocsUrl ?? null;
    const firstDocumentId = googleDocsResourceId(firstDocsUrl);
    const secondDocumentId = googleDocsResourceId(secondDocsUrl);

    if (firstDocumentId && secondDocumentId && firstDocumentId === secondDocumentId) {
      return serverResponse({
        success: false,
        message: "Validasi gagal",
        error: "Dua link Networking harus berasal dari dokumen Google Docs yang berbeda",
        status: 400,
      });
    }

    const update = {
      ...(body.first_docs_url !== undefined && { firstDocsUrl: body.first_docs_url }),
      ...(body.second_docs_url !== undefined && { secondDocsUrl: body.second_docs_url }),
    };
    const submission = await prisma.networkingSubmission.upsert({
      where: { userId },
      update,
      create: {
        userId,
        firstDocsUrl: body.first_docs_url,
        secondDocsUrl: body.second_docs_url,
      },
    });

    return serverResponse({
      success: true,
      message: "Submission Networking tersimpan",
      data: {
        submission: serializeSubmission(submission),
        progress: progressOf(submission),
      },
      status: 200,
    });
  } catch (error) {
    return taskSubmissionErrorResponse(error);
  }
}
