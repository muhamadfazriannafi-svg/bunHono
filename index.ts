import { app } from "./src/app.ts";
import { migrasi } from "./src/db.ts";

await migrasi();

export default { port: Number(process.env.PORT ?? 3000), fetch: app.fetch };
