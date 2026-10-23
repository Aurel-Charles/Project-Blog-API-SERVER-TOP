import "dotenv/config";
import express from 'express'
import { postsRouter } from "./routes/postsRouter.js";
import cors from "cors";
import { authRouter } from "./routes/authRouter.js";

const app = express()
const PORT = process.env.PORT || 3000;

app.use(cors({origin: process.env.CORS_ORIGINS.split(',')}))
app.use(express.json())

// Routes
app.use('/posts', postsRouter)
app.use('/auth', authRouter)

app.get('/', (req,res)=> {
    res.json({App: "Blog Server API", message : "Hello blogers"})
})

app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

app.use((err, req, res, next) => {
    console.error(err);
    const status = err.statusCode || 500;
    const message = status === 500 ? "Internal server error" : err.message;
    res.status(status).json({ error: message });
  });

app.listen(PORT, (error)=> {
    if (error) {
        throw error;
    }
    console.log(`Blog Server API - Express app - Visit: http://localhost:${PORT}`);
})