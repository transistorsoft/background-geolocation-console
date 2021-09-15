import format from 'date-fns/format';

export default function formatDate(date) {
  return format(date, 'MM-dd');
}
