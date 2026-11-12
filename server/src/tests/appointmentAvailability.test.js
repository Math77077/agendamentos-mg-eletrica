const {
  getBusinessHours,
  getMonthRange,
  getZonedDateParts,
  intervalsOverlap,
  isAppointmentTimeWithinBusinessHours,
  localDateTimeToDate,
  parseAppointmentDate,
  canChangeAppointmentTime,
} = require('../utils/appointmentAvailability');

describe('Appointment calendar availability', () => {
  it('uses the configured weekday and Saturday business hours', () => {
    expect(getBusinessHours('2026-11-09')).toEqual({ opensAt: 480, closesAt: 1080 });
    expect(getBusinessHours('2026-11-14')).toEqual({ opensAt: 480, closesAt: 720 });
    expect(getBusinessHours('2026-11-15')).toBeNull();
  });

  it('converts Manaus business hours to the correct instant', () => {
    const appointmentDate = localDateTimeToDate('2026-11-16', 8 * 60);

    expect(appointmentDate.toISOString()).toBe('2026-11-16T12:00:00.000Z');
    expect(getZonedDateParts(appointmentDate)).toMatchObject({
      year: '2026',
      month: '11',
      day: '16',
      hour: '08',
      minute: '00',
    });
  });

  it('parses appointment edits as Manaus wall-clock time', () => {
    const appointmentDate = parseAppointmentDate('2026-11-16T08:00');

    expect(appointmentDate.toISOString()).toBe('2026-11-16T12:00:00.000Z');
    expect(getZonedDateParts(appointmentDate)).toMatchObject({
      year: '2026',
      month: '11',
      day: '16',
      hour: '08',
      minute: '00',
    });
  });

  it('rejects invalid local appointment date-time values', () => {
    expect(parseAppointmentDate('2026-11-16T25:00')).toBeNull();
    expect(parseAppointmentDate('2026-02-31T08:00')).toBeNull();
    expect(parseAppointmentDate('not-a-date')).toBeNull();
  });

  it('only accepts future hourly slots that fit within the business hours', () => {
    const now = new Date();
    const parts = getZonedDateParts(now);
    const [year, month, day] = [parts.year, parts.month, parts.day].map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const daysUntilMonday = weekday === 0 ? 1 : 8 - weekday;
    const nextMonday = new Date(Date.UTC(year, month - 1, day + daysUntilMonday));
    const dateKey = `${nextMonday.getUTCFullYear()}-${String(nextMonday.getUTCMonth() + 1).padStart(2, '0')}-${String(nextMonday.getUTCDate()).padStart(2, '0')}`;

    expect(isAppointmentTimeWithinBusinessHours(localDateTimeToDate(dateKey, 8 * 60), 60)).toBe(true);
    expect(isAppointmentTimeWithinBusinessHours(localDateTimeToDate(dateKey, 17 * 60), 120)).toBe(false);
  });

  it('rejects invalid month parameters and returns valid month ranges', () => {
    expect(getMonthRange('2026-13')).toBeNull();
    expect(getMonthRange('not-a-month')).toBeNull();
    expect(getMonthRange('2026-11').daysInMonth).toBe(30);
  });

  it('detects overlapping appointment intervals', () => {
    expect(intervalsOverlap(0, 60, 30 * 60 * 1000, 60)).toBe(true);
    expect(intervalsOverlap(0, 60, 60 * 60 * 1000, 60)).toBe(false);
  });

  it('prevents changing appointment time after cancellation or completion', () => {
    const originalDate = new Date('2026-11-16T12:00:00.000Z');
    const changedTime = new Date('2026-11-16T13:00:00.000Z');

    expect(canChangeAppointmentTime('cancelled', originalDate, changedTime)).toBe(false);
    expect(canChangeAppointmentTime('completed', originalDate, changedTime)).toBe(false);
    expect(canChangeAppointmentTime('pending', originalDate, changedTime)).toBe(true);
    expect(canChangeAppointmentTime('completed', originalDate, originalDate)).toBe(true);
  });
});
