import "dotenv/config";
import express from 'express'
import { HttpError } from "./utils/httpErrorHandler.js";
import { postsRouter } from "./routes/postsRouter.js";
import cors from "cors";

const app = express()
const PORT = process.env.PORT || 3000;

app.use(cors())
app.use(express.json())

// Routes
app.use('/posts', postsRouter)

app.get('/', (req,res)=> {
    res.json({message: "Hello world"})
})



// route test
app.get("/test-error", () => {
    throw new HttpError("Post introuvable", 404);
  });
  
app.get("/test-crash", () => {
    throw new Error("Boom");
});


app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({error:  err.message});
});

app.listen(PORT, (error)=> {
    if (error) {
        throw error;
    }
    console.log(`Blog Serve API - Express app - Visit: http://localhost:${PORT}`);
})