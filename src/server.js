import { app } from "./app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, (error)=> {
    if (error) {
        throw error;
    }
    console.log(`Blog Server API - Express app - Visit: http://localhost:${PORT}`);
})