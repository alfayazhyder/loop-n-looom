import express from "express";

const app = express();

const PORT = 5000;

app.get("/", (_req, res) => {
  res.json({
    message: "LOOP_N_LOOOM backend is running",
  });
});

app.listen(PORT, () => {
  console.log(`LOOP_N_LOOOM backend running on http://localhost:${PORT}`);
});