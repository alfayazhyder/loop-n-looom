import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import adminRouter from "./routes/admin.routes";
import authRouter from "./routes/auth.routes";
import catalogTaxonomyRouter from "./routes/catalogTaxonomy.routes";
import customerAddressRouter from "./routes/customerAddress.routes";
import customerProfileRouter from "./routes/customerProfile.routes";
import productCatalogRouter from "./routes/productCatalog.routes";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({
    message: "LOOP_N_LOOOM backend is running",
  });
});

app.use("/api/auth", authRouter);

app.use("/api/customer", customerProfileRouter);

app.use(
  "/api/customer/addresses",
  customerAddressRouter,
);

app.use(
  "/api/products",
  productCatalogRouter,
);

app.use(
  "/api/catalog",
  catalogTaxonomyRouter,
);

app.use(
  "/api/admin",
  adminRouter,
);

app.listen(env.PORT, () => {
  console.log(
    `LOOP_N_LOOOM backend running on http://localhost:${env.PORT}`,
  );
});