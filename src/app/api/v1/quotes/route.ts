import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { NextRequest } from "next/server";
import { unauthorizedResponse } from "@/utils/serverResponse";

export async function POST(req: NextRequest) {
  let userId: number;
  try {
    ({ userId } = await authenticateRequest(req));
  } catch {
    return unauthorizedResponse();
  }
  const body = await req.json();
  if (!body) {
    return new Response("Bad Request", { status: 400 });
  }
  const quote = await prisma.quotes.create({
    data: {
      quote: body.quote,
      userId,
    },
    include: {
      user: {
        omit: {
          password: true,
        },
      },
    },
  });
  return new Response(JSON.stringify(quote), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: NextRequest) {
  const quotes = await prisma.quotes.findMany({
    include: {
      user: {
        omit: {
          password: true,
        },
      },
    },
  });
  const randomNum = Math.floor(Math.random() * quotes.length);
  return new Response(JSON.stringify(quotes[randomNum]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
