import "dotenv/config";
import express from 'express'
import { postsRouter } from "./routes/postsRouter.js";
import cors from "cors";
import { authRouter } from "./routes/authRouter.js";
import { docsRouter } from "./routes/docsRouter.js";

export const app = express()


app.use(cors({origin: process.env.CORS_ORIGINS.split(',')}))
app.use(express.json())

// Routes
app.use('/posts', postsRouter)
app.use('/auth', authRouter)
app.use('/docs', docsRouter)

app.get('/', (req,res)=> {
    res.json({App: "Blog Server API", message : "Hello blogers"})
})

app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
    if (status >= 500) console.error(err);
    const message = status === 500 ? "Internal server error" : err.message;
    res.status(status).json({ error: message });
  });

