import express, { Application } from "express";
import "dotenv/config";

const app: Application = express();

const PORT = process.env.PORT ?? 8000;

app.listen(PORT, () => {
  console.log(`Server is running on PORT => ${PORT}`);
});

export default app;
