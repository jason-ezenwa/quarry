export type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
