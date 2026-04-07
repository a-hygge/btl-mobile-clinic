export function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

export function formatDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function getCountdown(dateStr: string, timeStr: string): string {
  const apptDate = new Date(`${dateStr}T${timeStr}`);
  const now = new Date();
  const diffMs = apptDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 0) return 'Past';
  if (diffDays === 0) return `Today at ${timeStr}`;
  if (diffDays === 1) return `Tomorrow at ${timeStr}`;
  return `In ${diffDays} days`;
}

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: { message?: string } } } })
      .response;
    return resp?.data?.error?.message ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}
