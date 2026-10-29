"""PDF invoice generator — uses fpdf2 (free, zero dependencies)."""
from io import BytesIO
from fpdf import FPDF
from app.models.order import Order


class InvoicePDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(22, 163, 74)   # brand green
        self.cell(0, 10, "Pantry", ln=True)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 5, "Fresh Groceries Delivered", ln=True)
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")


def generate_invoice(order: Order) -> bytes:
    pdf = InvoicePDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Title
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 8, f"Invoice  #{order.order_number}", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 5, f"Date: {order.created_at.strftime('%B %d, %Y')}", ln=True)
    pdf.cell(0, 5, f"Status: {order.status.upper()}  |  Payment: {order.payment_status.upper()}", ln=True)
    pdf.ln(6)

    # Shipping address
    addr = order.shipping_address or {}
    if addr:
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 6, "Deliver to:", ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(60, 60, 60)
        pdf.cell(0, 5, addr.get("line1", ""), ln=True)
        if addr.get("line2"):
            pdf.cell(0, 5, addr["line2"], ln=True)
        pdf.cell(0, 5, f"{addr.get('city', '')}, {addr.get('state', '')} {addr.get('postal_code', '')}", ln=True)
        pdf.ln(5)

    # Items table header
    pdf.set_fill_color(243, 244, 246)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(0, 0, 0)
    col_w = [90, 20, 30, 40]
    headers = ["Product", "Qty", "Unit Price", "Total"]
    for w, h in zip(col_w, headers):
        pdf.cell(w, 7, h, border=1, fill=True)
    pdf.ln()

    # Items
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(40, 40, 40)
    for item in order.items:
        pdf.cell(col_w[0], 6, item.product_name[:45], border="LRB")
        pdf.cell(col_w[1], 6, str(item.quantity), border="RB", align="C")
        pdf.cell(col_w[2], 6, f"${float(item.unit_price):.2f}", border="RB", align="R")
        pdf.cell(col_w[3], 6, f"${float(item.total_price):.2f}", border="RB", align="R")
        pdf.ln()

    # Totals
    pdf.ln(4)
    totals = [
        ("Subtotal", order.subtotal),
        ("Shipping", order.shipping_amount),
        ("Tax", order.tax_amount),
    ]
    if float(order.discount_amount) > 0:
        totals.append(("Discount", f"-{order.discount_amount}"))

    for label, value in totals:
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(140, 6, label, align="R")
        pdf.cell(40, 6, f"${float(value):.2f}" if not str(value).startswith("-") else f"-${abs(float(str(value).lstrip('-'))):.2f}", align="R", ln=True)

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_fill_color(240, 253, 244)
    pdf.cell(140, 8, "TOTAL", align="R", fill=True, border="T")
    pdf.cell(40, 8, f"${float(order.total):.2f}", align="R", fill=True, border="T", ln=True)

    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, "Thank you for shopping with Pantry! Questions? Contact support@pantry.app", align="C")

    buf = BytesIO()
    pdf.output(buf)
    return buf.getvalue()
