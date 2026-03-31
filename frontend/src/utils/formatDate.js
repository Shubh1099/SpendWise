import dayjs from "dayjs";

export const formatDate = (date) => dayjs(date).format("DD MMM YYYY");

export const formatMonth = (date) => dayjs(date).format("MMMM YYYY");
