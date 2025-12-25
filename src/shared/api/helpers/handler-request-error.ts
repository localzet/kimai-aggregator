import { consola } from "consola/browser";
import { isAxiosError } from "axios";
import { ZodError } from "zod";

export function handleRequestError(error: unknown) {
  if (isAxiosError(error)) {
    const errorData = error.response?.data;
    const enhancedError = new Error(errorData?.message || "Request failed");
    enhancedError.cause = errorData;
    throw enhancedError;
  }

  if (error instanceof ZodError) {
    console.error(error.format());
  }

  console.log(error);

  throw error;
}
