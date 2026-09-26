import UIKit
import WebKit
import Security
import UniformTypeIdentifiers

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = MingliController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

final class LocalAssets: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.scheme == "mingli", url.host == "app",
              let root = Bundle.main.resourceURL?.appendingPathComponent("Web") else {
            task.didFailWithError(URLError(.badURL)); return
        }
        let route = url.path == "/" || url.path.isEmpty ? "/index.html" : url.path
        let base = root.appendingPathComponent(route).standardizedFileURL
        guard base.path.hasPrefix(root.path + "/") else { task.didFailWithError(URLError(.noPermissionsToReadFile)); return }
        let candidates = [base, base.appendingPathExtension("html"), base.appendingPathComponent("index.html")]
        guard let file = candidates.first(where: { FileManager.default.fileExists(atPath: $0.path) && !$0.hasDirectoryPath }),
              let data = try? Data(contentsOf: file) else { task.didFailWithError(URLError(.fileDoesNotExist)); return }
        let ext = file.pathExtension
        let mime = ["html": "text/html", "js": "application/javascript", "css": "text/css", "json": "application/json", "txt": "text/plain", "svg": "image/svg+xml", "woff2": "font/woff2"][ext] ?? UTType(filenameExtension: ext)?.preferredMIMEType ?? "application/octet-stream"
        task.didReceive(URLResponse(url: url, mimeType: mime, expectedContentLength: data.count, textEncodingName: ["html","js","css","txt","json","svg"].contains(ext) ? "utf-8" : nil))
        task.didReceive(data)
        task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

final class MingliController: UIViewController, WKScriptMessageHandlerWithReply, WKNavigationDelegate, WKUIDelegate, URLSessionTaskDelegate {
    private var web: WKWebView!
    private var sessionKey: String?
    private var aiBusy = false
    private var faceBusy = false
    private let keyQuery: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.tohuang.mingli.deepseek", kSecAttrAccount as String: "api-key"]
    private var shield: UIView?
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 16/255, green: 19/255, blue: 16/255, alpha: 1)
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(LocalAssets(), forURLScheme: "mingli")
        config.websiteDataStore = .default()
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        config.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "mingli")
        if let file = Bundle.main.url(forResource: "bridge", withExtension: "js"), let source = try? String(contentsOf: file, encoding: .utf8) {
            config.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.isOpaque = false
        web.backgroundColor = view.backgroundColor
        web.scrollView.backgroundColor = view.backgroundColor
        view.addSubview(web)
        web.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), web.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor), web.leadingAnchor.constraint(equalTo: view.leadingAnchor), web.trailingAnchor.constraint(equalTo: view.trailingAnchor)])
        web.load(URLRequest(url: URL(string: "mingli://app/")!))
        NotificationCenter.default.addObserver(self, selector: #selector(hidePrivateContent), name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(showPrivateContent), name: UIApplication.didBecomeActiveNotification, object: nil)
        cleanExports()
    }
    @objc private func hidePrivateContent() {
        guard shield == nil else { return }
        let cover = UIView(frame: view.bounds); cover.backgroundColor = view.backgroundColor; cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]; view.addSubview(cover); shield = cover
    }
    @objc private func showPrivateContent() { shield?.removeFromSuperview(); shield = nil }
    private func readKey() -> String? {
        if let sessionKey { return sessionKey }
        var query = keyQuery; query[kSecReturnData as String] = true; query[kSecMatchLimit as String] = kSecMatchLimitOne
        var value: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &value) == errSecSuccess, let data = value as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    private func deleteKey() -> Bool { let status = SecItemDelete(keyQuery as CFDictionary); return status == errSecSuccess || status == errSecItemNotFound }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage, replyHandler reply: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.protocol == "mingli", message.frameInfo.securityOrigin.host == "app",
              let body = message.body as? [String: Any], let action = body["action"] as? String else { reply(nil, "拒絕非本機請求。"); return }
        let value = body["value"]
        switch action {
        case "status": reply(["configured": readKey() != nil, "remembered": sessionKey == nil && readKey() != nil], nil)
        case "clearKey":
            guard deleteKey() else { reply(["error": "金鑰刪除失敗。"], nil); return }; sessionKey = nil; reply([:], nil)
        case "saveKey":
            guard let input = value as? [String: Any], let key = input["key"] as? String, key.count >= 16, key.count <= 256, key.rangeOfCharacter(from: .whitespacesAndNewlines) == nil, let remember = input["remember"] as? Bool else { reply(["error": "金鑰格式不正確。"], nil); return }
            if remember {
                var attributes: [String: Any] = [kSecValueData as String: Data(key.utf8), kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
                var status = SecItemUpdate(keyQuery as CFDictionary, attributes as CFDictionary)
                if status == errSecItemNotFound { attributes.merge(keyQuery) { current, _ in current }; status = SecItemAdd(attributes as CFDictionary, nil) }
                guard status == errSecSuccess else { reply(["error": "無法儲存至 Keychain。"], nil); return }
                sessionKey = nil
            } else {
                guard deleteKey() else { reply(["error": "無法移除舊金鑰。"], nil); return }; sessionKey = key
            }
            reply([:], nil)
        case "face":
            guard !faceBusy, let base64 = value as? String, base64.count <= 20_000_000, let data = Data(base64Encoded: base64), data.count <= 15_000_000 else { reply(["error": "照片過大或正在分析。"], nil); return }
            faceBusy = true
            DispatchQueue.global(qos: .userInitiated).async {
                let result = analyzeFaceImage(data)
                let object = (try? JSONEncoder().encode(result)).flatMap { try? JSONSerialization.jsonObject(with: $0) } ?? ["error": "照片分析失敗。"]
                DispatchQueue.main.async { self.faceBusy = false; reply(object, nil) }
            }
        case "export":
            guard let input = value as? [String: Any], let raw = input["raw"] as? String, raw.utf8.count <= 12_000_000, let name = input["name"] as? String, ["mingli-backup.json", "mingli-face.json"].contains(name), (try? JSONSerialization.jsonObject(with: Data(raw.utf8))) != nil, presentedViewController == nil else { reply(["error": "匯出資料不正確或分享視窗已開啟。"], nil); return }
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent("mingli-export-" + UUID().uuidString)
            do {
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
                let file = directory.appendingPathComponent(name)
                try Data(raw.utf8).write(to: file, options: [.atomic, .completeFileProtection])
                let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
                share.popoverPresentationController?.sourceView = view
                share.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
                share.completionWithItemsHandler = { _, completed, _, error in
                    try? FileManager.default.removeItem(at: directory)
                    reply(error == nil ? ["canceled": !completed] : ["error": "匯出失敗。"], nil)
                }
                present(share, animated: true)
            } catch { try? FileManager.default.removeItem(at: directory); reply(["error": "無法建立匯出檔。"], nil) }
        case "interpret": interpret(value, reply: reply)
        default: reply(nil, "不支援的操作。")
        }
    }
    private func interpret(_ value: Any?, reply: @escaping (Any?, String?) -> Void) {
        guard !aiBusy else { reply(["error": "正在解讀，請稍候。"], nil); return }
        guard let key = readKey() else { reply(["error": "請先設定 DeepSeek 金鑰。"], nil); return }
        guard let payload = value as? [String: Any], payload["model"] as? String == "deepseek-flash", payload["max_output_tokens"] as? Int == 5000, let data = try? JSONSerialization.data(withJSONObject: payload), data.count <= 250_000 else { reply(["error": "解讀資料格式不正確。"], nil); return }
        let now = Date().timeIntervalSince1970
        let defaults = UserDefaults.standard
        let recent = (defaults.array(forKey: "aiRequests") as? [Double] ?? []).filter { $0 > now - 86400 }
        guard recent.count < 40, recent.filter({ $0 > now - 60 }).count < 8 else { reply(["error": "已達本機 AI 使用上限（每分鐘 8 次、24 小時 40 次）。"], nil); return }
        defaults.set(recent + [now], forKey: "aiRequests")
        aiBusy = true
        var request = URLRequest(url: URL(string: "https://api.deepseek.com/responses")!)
        request.httpMethod = "POST"; request.httpBody = data; request.timeoutInterval = 45
        request.setValue("Bearer " + key, forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 45; config.timeoutIntervalForResource = 60; config.urlCache = nil; config.httpCookieStorage = nil
        let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
        session.dataTask(with: request) { data, response, error in
            session.finishTasksAndInvalidate()
            var result: Any = ["error": "DeepSeek 連線失敗，請確認網路後重試。"]
            if let status = (response as? HTTPURLResponse)?.statusCode {
                if status == 401 { result = ["error": "DeepSeek 金鑰無效，請重新設定。"] }
                else if status == 402 { result = ["error": "DeepSeek 帳戶餘額不足。"] }
                else if status == 429 { result = ["error": "DeepSeek 暫時限制請求，請稍後重試。"] }
                else if error == nil, status == 200, let data, data.count <= 2_000_000, let object = try? JSONSerialization.jsonObject(with: data) { result = object }
            }
            DispatchQueue.main.async { self.aiBusy = false; reply(result, nil) }
        }.resume()
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(action.request.url?.scheme == "mingli" && action.request.url?.host == "app" ? .allow : .cancel)
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: "確認操作", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "確認", style: .destructive) { _ in completionHandler(true) })
        present(alert, animated: true)
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }
    private func cleanExports() {
        for file in (try? FileManager.default.contentsOfDirectory(at: FileManager.default.temporaryDirectory, includingPropertiesForKeys: nil)) ?? [] where file.lastPathComponent.hasPrefix("mingli-export-") { try? FileManager.default.removeItem(at: file) }
    }
}
