# Local caching mirror of the live GitHub Pages site (the sandbox browser cannot tunnel out directly).
import http.server, socketserver, urllib.request, os, hashlib, mimetypes, sys
ORIGIN="https://2023anita.github.io"
CACHE=os.environ.get("MIRROR_CACHE","/tmp/ow-mirror"); os.makedirs(CACHE,exist_ok=True)
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        if self.path.startswith("/or/"): return self._or()
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
    # /or/* -> https://openrouter.ai/api/v1/* for live-AI captures (key from $OPENROUTER_API_KEY or an egress proxy; never cached).
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin","*"); self.send_header("Access-Control-Allow-Headers","*"); self.send_header("Access-Control-Allow-Methods","GET,POST,OPTIONS")
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def _or(self, body=None):
        url="https://openrouter.ai/api/v1/"+self.path[len("/or/"):]
        hdr={k:v for k,v in self.headers.items() if k.lower() in ("content-type","http-referer","x-title")}
        if os.environ.get("OPENROUTER_API_KEY"): hdr["Authorization"]="Bearer "+os.environ["OPENROUTER_API_KEY"]  # else an egress proxy must add it
        req=urllib.request.Request(url,data=body,headers=hdr,method=self.command)
        try:
            with urllib.request.urlopen(req,timeout=180) as r: code,data,ct=r.status,r.read(),r.headers.get("Content-Type","application/json")
        except urllib.error.HTTPError as e: code,data,ct=e.code,e.read(),e.headers.get("Content-Type","application/json")
        self.send_response(code); self._cors(); self.send_header("Content-Type",ct); self.send_header("Content-Length",str(len(data))); self.end_headers(); self.wfile.write(data)
    def do_POST(self):
        if not self.path.startswith("/or/"): self.send_response(404); self.end_headers(); return
        self._or(self.rfile.read(int(self.headers.get("Content-Length",0))))
class S(socketserver.ThreadingMixIn,http.server.HTTPServer): daemon_threads=True
S(("127.0.0.1",8800),H).serve_forever()
