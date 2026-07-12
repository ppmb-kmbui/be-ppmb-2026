import type { ServerResponseType } from "@/types/api-type";
import { NextResponse } from "next/server";

export default function serverResponse <T> (
    {success, 
    message = undefined, 
    error = undefined, 
    data = undefined, 
    status = 200}: 
    ServerResponseType<T>): NextResponse<ServerResponseType<T>> {
        const response: ServerResponseType<T> = {success, status};

        if (message !== undefined) response.message = message
        if (error !== undefined) response.error = error
        if (data !== undefined) response.data = data

        return NextResponse.json(response, {status: response.status});
}

export const InvalidUserResponse = serverResponse({success: false, message: "Invalid", error: "User tidak ditemukan", status: 404});
export const InvalidTargetUserResponse = serverResponse({success: false, message: "Invalid", error: "Target User tidak ditemukan", status: 404});

export const InvalidHeadersResponse = serverResponse({success: false, message: "Not Authorized", error: "Headers tidak ditemukan", status: 400});

export function unauthorizedResponse() {
    return serverResponse({
        success: false,
        message: "Tidak diizinkan",
        error: "JWT token tidak valid atau tidak ditemukan",
        status: 401,
    });
}

export function forbiddenResponse() {
    return serverResponse({
        success: false,
        message: "Forbidden",
        error: "Akses admin dibutuhkan",
        status: 403,
    });
}
