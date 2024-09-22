"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const app = (0, express_1.default)();
// import swaggerFile from './swagger_output.json';
const routes_1 = __importDefault(require("./routes"));
const { PORT } = process.env;
app.use((0, cors_1.default)({ origin: '*' }));
app.use(body_parser_1.default.json());
// app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerFile))
app.use("/api", routes_1.default.api);
app.listen(PORT, () => {
    console.log(`Server is running`);
});
