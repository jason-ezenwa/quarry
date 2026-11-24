import { z } from "zod";

// A string that holds something once trimmed.
export const requiredText = z.string().trim().min(1);
