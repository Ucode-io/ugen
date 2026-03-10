import * as z from "zod";

export const clientTypeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  table_slug: z.string().min(2, "Table slug must be at least 2 characters"),
  default_page: z.string().url("Must be a valid URL").or(z.literal("")),
  session_limit: z.number().min(1, "Session limit must be at least 1"),
  self_recover: z.boolean(),
  self_register: z.boolean(),
});

export type ClientTypeFormValues = z.infer<typeof clientTypeSchema>;
