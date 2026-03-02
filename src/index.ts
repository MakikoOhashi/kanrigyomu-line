import express from "express";
import webhookRouter from "./routes/webhook";
import pushDailyRouter from "./routes/pushDaily";
import { assertRequiredEnv } from "./lib/env";

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as { rawBody?: string }).rawBody = buf.toString("utf8");
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "line-study-bot" });
});

app.use(webhookRouter);
app.use(pushDailyRouter);

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

assertRequiredEnv();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});
