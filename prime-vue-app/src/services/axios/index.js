import axios from "axios";
const myAxios = axios.create({
  baseURL: "https://localhost:7027/api/v1",
});
export default myAxios;
