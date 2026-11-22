# Local caching mirror of the live GitHub Pages site (the sandbox browser cannot tunnel out directly).
import http.server, socketserver, urllib.request, os, hashlib, mimetypes, sys
ORIGIN="https://2023anita.github.io"
CACHE="/tmp/ow-mirror"; os.makedirs(CACHE,exist_ok=True)
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        path=self.path.split("#")[0]
        key=os.path.join(CACHE,hashlib.sha1(path.encode()).hexdigest())
        try:
            if os.path.exists(key):
                data=open(key,"rb").read(); ct=open(key+".ct").read()
            else:
                with urllib.request.urlopen(ORIGIN+path,timeout=60) as r:
                    data=r.read(); ct=r.headers.get("Content-Type","application/octet-stream")
                open(key,"wb").write(data); open(key+".ct","w").write(ct)
            self.send_response(200); self.send_header("Content-Type",ct); self.send_header("Content-Length",str(len(data))); self.end_headers(); self.wfile.write(data)
        except urllib.error.HTTPError as e:
            self.send_response(e.code); self.end_headers()
        except Exception as e:
            self.send_response(502); self.end_headers()
class S(socketserver.ThreadingMixIn,http.server.HTTPServer): daemon_threads=True
S(("127.0.0.1",8800),H).serve_forever()
