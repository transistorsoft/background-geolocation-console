export function dateToString(date) {
  const f = (x) => x < 10 ? `0${x}` : x.toString();
  return `${date.getFullYear()}-${f(date.getMonth() + 1)}-${f(date.getDate())}`;
}

export function dateTimeToString(date) {
  const f = (x) => x < 10 ? `0${x}` : x.toString();
  return `${date.getFullYear()}-${f(date.getMonth() + 1)}-${f(date.getDate())}T${f(date.getHours())}:${f(date.getMinutes())}`;
}

export function getTodayStart() {
      const today = new Date();
      today.setHours(0);
      today.setMinutes(0);
      today.setSeconds(0)
      today.setMilliseconds(0);
      return dateTimeToString(today);

}
export function getTodayEnd() {
      const now = new Date();
      now.setHours(23);
      now.setMinutes(59);
      now.setSeconds(0)
      now.setMilliseconds(0);
      return dateTimeToString(now);
}
