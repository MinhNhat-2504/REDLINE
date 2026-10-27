export const ERROR_VI: Record<string, string> = {
  "The transaction check failed. Refresh the policy or balance and review the details before signing.": "Kiểm tra giao dịch chưa thành công. Tải lại chính sách hoặc số dư và xem chi tiết trước khi ký.",
  "The transaction was refused. Review the details before trying again.": "Giao dịch bị từ chối. Xem chi tiết trước khi thử lại.",
  "The transaction window expired. Check the account before signing again.": "Thời gian gửi giao dịch đã hết. Kiểm tra tài khoản trước khi ký lại.",
  "The vault is confirmed but not readable yet. Check status again.": "Quỹ đã xác nhận nhưng chưa đọc được dữ liệu. Kiểm tra trạng thái lại.",
  "This unsigned policy has expired. Discard it and review a new policy.": "Chính sách chưa ký đã hết hạn. Bỏ thiết lập này rồi xem lại chính sách mới.",
  "This policy account already exists. Check its recorded transaction before continuing.": "Tài khoản chính sách đã tồn tại. Kiểm tra giao dịch đã ghi trước khi tiếp tục.",
  "A policy operation is already in progress. Wait for it to finish.": "Một thao tác chính sách đang chạy. Chờ hoàn tất trước khi tiếp tục.",
  "A policy operation is already open in another tab.": "Một thao tác chính sách đang mở ở tab khác.",
  "Your session expired. Sign in with this wallet and continue the saved operation.": "Phiên đăng nhập hết hạn. Đăng nhập bằng ví này rồi tiếp tục thao tác đã lưu.",
  "Add Devnet SOL to your wallet for network fees, then check the saved operation.": "Nạp SOL Devnet vào ví để trả phí mạng, rồi kiểm tra thao tác đã lưu.",
  "Something went wrong. Review the details before continuing.": "Thao tác chưa hoàn tất. Xem chi tiết trước khi tiếp tục.",
};

/** Keep transport/program detail available without making it the main instruction. */
export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/user.*reject|wallet.*reject|declin|cancel|4001/i.test(message)) return "The wallet request was cancelled. Your form is kept; review it and try again.";
  if (/fetch|network|timeout|timed out|unreachable|offline|503|502/i.test(message)) return "The connection was interrupted. Check the saved transaction status before trying again.";
  if (/401|session|unauthenticated/i.test(message)) return "Your session expired. Sign in with this wallet and continue the saved operation.";
  if (/insufficient.*lamport|insufficient.*SOL/i.test(message)) return "Add Devnet SOL to your wallet for network fees, then check the saved operation.";
  if (/simulat|estimate.*compute/i.test(message)) return "The transaction check failed. Refresh the policy or balance and review the details before signing.";
  return message;
}

export function displayDate(value: number | string | Date, lang: "en" | "vi") {
  return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}
