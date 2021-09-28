export function dateToString(date) {
  const f = (x) => x < 10 ? `0${x}` : x.toString();
  return `${date.getFullYear()}-${f(date.getMonth() + 1)}-${f(date.getDate())}`;
}

export function dateTimeToString(date) {
  const f = (x) => x < 10 ? `0${x}` : x.toString();
  return `${date.getFullYear()}-${f(date.getMonth() + 1)}-${f(date.getDate())}T${f(date.getHours())}:${f(date.getMinutes())}`;
}
