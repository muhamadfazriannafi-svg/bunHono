export type Status = "success" | "error";

export const ok = <T>(data: T, message = "OK", status = 200) =>
  Response.json({ status: "success" as Status, message, data }, { status });

export const fail = (message: string, status: number, errors?: unknown) =>
  Response.json({ status: "error" as Status, message, data: null, errors }, { status });

export const rapikan = <T extends { kata_sandi_hash?: string }>(row: T) => {
  const { kata_sandi_hash, ...rest } = row;
  return rest;
};
