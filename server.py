
import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

PORT = 8000

class CurrencyProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve static files for root/index/css/js
        # SimpleHTTPRequestHandler handles relative paths (css/style.css) automatically
        if not self.path.startswith('/api/rates'):
            return super().do_GET()

        # Handle API request
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*') # Allow any origin for local dev
        self.end_headers()

        # Parse Query Params
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        
        # Extract params (defaults if missing)
        base = params.get('base', ['CNY'])[0]    # Card Currency (Billing) e.g. CNY
        target = params.get('target', ['USD'])[0] # Transaction Currency e.g. USD
        amount = params.get('amount', ['100'])[0]
        date_str = params.get('date', [datetime.now().strftime('%Y-%m-%d')])[0]

        logging.info(f"API Request: Base={base}, Target={target}, Amount={amount}, Date={date_str}")

        results = {
            "visa": None,
            "mastercard": None
        }

        # 1. Fetch VISA
        # Visa API: https://www.visa.co.uk/cmsapi/fx/rates
        # Params: amount, fromCurr (Target), toCurr (Base), fee (0), utcConvertedDate (MM/DD/YYYY)
        try:
            # Format date for Visa: MM/DD/YYYY
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            visa_date = dt.strftime('%m/%d/%Y')
            
            visa_url = f"https://www.visa.co.uk/cmsapi/fx/rates?amount={amount}&fromCurr={target}&toCurr={base}&fee=0&utcConvertedDate={visa_date}"
            logging.info(f"Fetching Visa: {visa_url}")
            
            req = urllib.request.Request(visa_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    # Visa returns: { "originalValues": { "fromCurrency": "USD", "toCurrency": "CNY", ...}, "conversionAmountValue": "720.5", ... }
                    # We need the rate. often implied by conversion / amount.
                    # Or 'exchangeRate' field.
                    if 'conversionAmountValue' in data:
                        results['visa'] = {
                            'rate': float(data.get('conversionAmountValue')) / float(amount) if float(amount) else 0,
                            'amount': float(data.get('conversionAmountValue'))
                        }
        except Exception as e:
            logging.error(f"Visa Error: {e}")

        # 2. Fetch Mastercard
        # MC API: https://www.mastercard.us/settlement/currencyrate/conversion-rate
        # Params: fxDate (YYYY-MM-DD), transCurr (Target), crdhldBillCurr (Base), bankFee (0), transAmt (amount)
        try:
            mc_url = f"https://www.mastercard.us/settlement/currencyrate/conversion-rate?fxDate={date_str}&transCurr={target}&crdhldBillCurr={base}&bankFee=0&transAmt={amount}"
            logging.info(f"Fetching Mastercard: {mc_url}")
            
            req = urllib.request.Request(mc_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    # MC returns: { "data": { "conversionRate": 0.14, "crdhldBillAmt": 14.00, ... } }
                    if 'data' in data:
                        results['mastercard'] = {
                            'rate': data['data'].get('conversionRate'),
                            'amount': data['data'].get('crdhldBillAmt')
                        }
        except Exception as e:
            logging.error(f"Mastercard Error: {e}")

        # Send JSON response
        self.wfile.write(json.dumps(results).encode('utf-8'))

if __name__ == "__main__":
    print(f"Starting server at http://localhost:{PORT}")
    print("Please open http://localhost:8000 in your browser to use the calculator.")
    with socketserver.TCPServer(("", PORT), CurrencyProxyHandler) as httpd:
        httpd.serve_forever()
