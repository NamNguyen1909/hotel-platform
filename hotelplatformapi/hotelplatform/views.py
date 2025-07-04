from datetime import datetime
import hashlib
import hmac
from django.shortcuts import redirect, render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import urllib

# Create your views here.
def home(request):
    return HttpResponse('Welcome to Hotel Platform API!')


# ======================================== VNPay ========================================
def vnpay_encode(value):
    # Encode giống VNPay: dùng quote_plus để chuyển space thành '+'
    from urllib.parse import quote_plus
    return quote_plus(str(value), safe='')

@csrf_exempt
def create_payment_url(request):
    import pytz
    tz = pytz.timezone("Asia/Ho_Chi_Minh")

    vnp_TmnCode = 'GUPETCYO'
    vnp_HashSecret = 'E2G0Y153XRTW37LVRKW8DJ1TGEQ9RK6I'
    vnp_Url = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
    vnp_ReturnUrl = 'https://event-management-and-online-booking.onrender.com/vnpay/redirect?from=app'

    #Nhận các thông tin đơn hàng từ request
    amount = request.GET.get("amount", "10000")  # đơn vị VND
    order_type = "other"
    #Tạo mã giao dịch và ngày giờ
    order_id = datetime.now(tz).strftime('%H%M%S')
    create_date = datetime.now(tz).strftime('%Y%m%d%H%M%S')
    ip_address = request.META.get('REMOTE_ADDR')

    #Tạo dữ liệu gửi lên VNPay
    input_data = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": vnp_TmnCode,
        "vnp_Amount": str(int(float(amount)) * 100),
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": order_id,
        "vnp_OrderInfo": "Thanh toan don hang",
        "vnp_OrderType": order_type,
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": vnp_ReturnUrl,
        "vnp_IpAddr": ip_address,
        "vnp_CreateDate": create_date
    }
    print("Input data before signing:", input_data)
    #Tạo chữ ký (vnp_SecureHash) để đảm bảo dữ liệu không bị giả mạo
    sorted_data = sorted(input_data.items())
    query_string = '&'.join(
        f"{k}={vnpay_encode(v)}"
        for k, v in sorted(input_data.items())
        if v
    )
    # Chỉ lấy các key có giá trị, không lấy vnp_SecureHash
    hash_data = '&'.join(
        f"{k}={vnpay_encode(v)}"
        for k, v in sorted(input_data.items())
        if v and k != "vnp_SecureHash"
    )

    secure_hash = hmac.new(
        bytes(vnp_HashSecret, 'utf-8'),
        bytes(hash_data, 'utf-8'),
        hashlib.sha512
    ).hexdigest()
    # Tạo payment_url đầy đủ để redirect người dùng
    payment_url = f"{vnp_Url}?{query_string}&vnp_SecureHash={secure_hash}"
    #Trả kết quả về frontend
    return JsonResponse({"payment_url": payment_url})

def vnpay_response_message(code):
    mapping = {
        "00": "Giao dịch thành công.",
        "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).",
        "09": "Thẻ/Tài khoản chưa đăng ký InternetBanking.",
        "10": "Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.",
        "11": "Hết hạn chờ thanh toán. Vui lòng thực hiện lại giao dịch.",
        "12": "Thẻ/Tài khoản bị khóa.",
        "13": "Sai mật khẩu xác thực giao dịch (OTP).",
        "24": "Khách hàng hủy giao dịch.",
        "51": "Tài khoản không đủ số dư.",
        "65": "Tài khoản vượt quá hạn mức giao dịch trong ngày.",
        "75": "Ngân hàng thanh toán đang bảo trì.",
        "79": "Sai mật khẩu thanh toán quá số lần quy định.",
        "99": "Lỗi khác hoặc không xác định.",
    }
    return mapping.get(code, "Lỗi không xác định.")

def vnpay_redirect(request):
    """
    Xử lý callback từ VNPay về sau khi thanh toán.
    Nếu truy cập từ app (from=app), trả về HTML vừa gửi postMessage về FE, vừa hiển thị giao diện đẹp cho user.
    Nếu truy cập từ web, trả về deeplink hoặc giao diện web.
    """
    from_app = request.GET.get('from') == 'app'
    vnp_ResponseCode = request.GET.get('vnp_ResponseCode')
    # ... lấy các tham số khác nếu cần

    if vnp_ResponseCode is None:
        return HttpResponse("Thiếu tham số vnp_ResponseCode.", status=400)

    message = vnpay_response_message(vnp_ResponseCode)

    if from_app:
        # Kết hợp: vừa gửi postMessage về FE, vừa render giao diện đẹp
        return HttpResponse(f"""
            <html>
            <head>
                <meta charset="utf-8"/>
                <style>
                    body {{
                        background: #f5f6fa;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }}
                    .result-box {{
                        background: #fff;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                        padding: 32px 48px;
                        text-align: center;
                    }}
                    .result-title {{
                        color: #2d8cf0;
                        font-size: 3rem;
                        margin-bottom: 12px;
                    }}
                    .result-message {{
                        color: #333;
                        font-size: 1.7rem;
                    }}
                </style>
                <script>
                // Gửi callback về FE qua postMessage để app luôn nhận được kết quả
                setTimeout(function() {{
                    if (window.ReactNativeWebView) {{
                        window.ReactNativeWebView.postMessage(JSON.stringify({{
                            vnp_ResponseCode: "{vnp_ResponseCode}",
                            message: "{message}"
                        }}));
                    }}
                }}, 500);
                </script>
            </head>
            <body>
                <div class="result-box">
                    <div class="result-title">Kết quả thanh toán</div>
                    <div class="result-message">{message}</div>
                </div>
            </body>
            </html>
        """)
    else:
        # Nếu không phải từ app, trả về deeplink hoặc giao diện web
        deeplink = f"bemmobile://payment-result?vnp_ResponseCode={vnp_ResponseCode}&message={urllib.parse.quote(message)}"
        return redirect(deeplink)