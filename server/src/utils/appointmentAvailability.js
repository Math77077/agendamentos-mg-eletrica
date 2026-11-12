const BUSINESS_TIME_ZONE = process.env.BUSINESS_TIME_ZONE || 'America/Manaus';
const SLOT_INTERVAL_MINUTES = 60;
const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'confirmed'];
const CALENDAR_APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed'];

const getZonedDateParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

const dateKeyFromParts = ({ year, month, day }) => `${year}-${month}-${day}`;

const localDateTimeToDate = (dateKey, minutesAfterMidnight) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const hour = Math.floor(minutesAfterMidnight / 60);
  const minute = minutesAfterMidnight % 60;
  const targetWallTime = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = targetWallTime;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = getZonedDateParts(new Date(timestamp));
    const observedWallTime = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    );
    const difference = targetWallTime - observedWallTime;

    if (difference === 0) {
      return new Date(timestamp);
    }

    timestamp += difference;
  }

  return null;
};

const parseAppointmentDate = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const localDateTime = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (localDateTime) {
    const [, dateKey, hourText, minuteText] = localDateTime;
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (hour > 23 || minute > 59) {
      return null;
    }

    const date = localDateTimeToDate(dateKey, hour * 60 + minute);
    if (!date) {
      return null;
    }

    const parts = getZonedDateParts(date);
    return dateKeyFromParts(parts) === dateKey
      && Number(parts.hour) === hour
      && Number(parts.minute) === minute
      ? date
      : null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getBusinessHours = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  if (weekday >= 1 && weekday <= 5) {
    return { opensAt: 8 * 60, closesAt: 18 * 60 };
  }

  if (weekday === 6) {
    return { opensAt: 8 * 60, closesAt: 12 * 60 };
  }

  return null;
};

const getDurationMinutes = (appointment) =>
  appointment.service?.durationMinutes || 15;

const intervalsOverlap = (firstStart, firstDuration, secondStart, secondDuration) =>
  firstStart < secondStart + secondDuration * 60000
  && secondStart < firstStart + firstDuration * 60000;

const canChangeAppointmentTime = (status, currentDate, updatedDate) => {
  if (!['cancelled', 'completed'].includes(status)) {
    return true;
  }

  return Math.floor(currentDate.getTime() / 60000)
    === Math.floor(updatedDate.getTime() / 60000);
};

const getMonthRange = (month) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) {
    return null;
  }

  const [year, monthNumber] = month.split('-').map(Number);
  const firstDay = `${month}-01`;
  const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));
  const nextMonthDay = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const start = localDateTimeToDate(firstDay, 0);
  const end = localDateTimeToDate(nextMonthDay, 0);

  if (!start || !end) {
    return null;
  }

  return {
    year,
    monthNumber,
    start,
    end,
    daysInMonth: new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(),
  };
};

const isAppointmentTimeWithinBusinessHours = (appointmentDate, durationMinutes) => {
  const parts = getZonedDateParts(appointmentDate);
  const dateKey = dateKeyFromParts(parts);
  const hours = getBusinessHours(dateKey);

  if (!hours) {
    return false;
  }

  const minutesAfterMidnight = Number(parts.hour) * 60 + Number(parts.minute);
  return minutesAfterMidnight % SLOT_INTERVAL_MINUTES === 0
    && minutesAfterMidnight >= hours.opensAt
    && minutesAfterMidnight + durationMinutes <= hours.closesAt
    && appointmentDate > new Date();
};

module.exports = {
  ACTIVE_APPOINTMENT_STATUSES,
  BUSINESS_TIME_ZONE,
  CALENDAR_APPOINTMENT_STATUSES,
  SLOT_INTERVAL_MINUTES,
  canChangeAppointmentTime,
  dateKeyFromParts,
  getBusinessHours,
  getDurationMinutes,
  getMonthRange,
  parseAppointmentDate,
  getZonedDateParts,
  intervalsOverlap,
  isAppointmentTimeWithinBusinessHours,
  localDateTimeToDate,
};
