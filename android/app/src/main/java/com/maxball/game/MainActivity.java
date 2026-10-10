package com.maxball.game;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;

/** The online app uses the same HTTPS origin as the browser; cookies, CSRF and WSS stay unchanged. */
public class MainActivity extends Activity {
    private static final String LOCAL_HOST = "appassets.androidplatform.net";
    private static final String LOCAL_URL = "https://" + LOCAL_HOST + "/game/index.html";
    private WebView game;
    private String startUrl;
    private Uri trustedOrigin;
    private boolean leaving;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        startUrl = BuildConfig.SERVER_URL.isEmpty() ? LOCAL_URL : BuildConfig.SERVER_URL;
        trustedOrigin = Uri.parse(startUrl);
        game = new WebView(this);
        game.setBackgroundColor(Color.rgb(10, 23, 42));
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " MAXBALL-Android/1");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(game, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        game.setWebChromeClient(new WebChromeClient());
        game.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return localResource(request.getUrl(), request.getMethod());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (sameOrigin(uri) || isLocalOrigin(uri)) return false;
                // Payment providers open outside the game. No JavaScript bridge is exposed to websites.
                if ("https".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException ignored) { showError("Não há navegador disponível para abrir o pagamento."); }
                }
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError("Não foi possível abrir o MAXBALL. Código " + error.getErrorCode() + ": " + error.getDescription());
            }
        });
        setContentView(game);
        fullscreen();
        game.loadUrl(startUrl);
    }

    private boolean isLocalOrigin(Uri uri) {
        return "https".equals(uri.getScheme()) && LOCAL_HOST.equals(uri.getHost()) && uri.getPort() == -1;
    }
    private WebResourceResponse missingResource() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private WebResourceResponse localResource(Uri uri, String method) {
        if (!isLocalOrigin(uri)) return null;
        // Always handle this origin locally, including missing paths: never contact a server.
        String resource = uri.getPath();
        if (!"GET".equals(method) || resource == null || !resource.startsWith("/game/") ||
            resource.indexOf('\\') >= 0 || resource.indexOf('\0') >= 0) return missingResource();
        for (String segment : resource.split("/")) {
            if ("..".equals(segment) || ".".equals(segment)) return missingResource();
        }
        String mime = "application/octet-stream";
        if (resource.endsWith(".html")) mime = "text/html";
        else if (resource.endsWith(".js")) mime = "application/javascript";
        else if (resource.endsWith(".css")) mime = "text/css";
        else if (resource.endsWith(".svg")) mime = "image/svg+xml";
        else if (resource.endsWith(".png")) mime = "image/png";
        else if (resource.endsWith(".jpg") || resource.endsWith(".jpeg")) mime = "image/jpeg";
        else if (resource.endsWith(".webp")) mime = "image/webp";
        else if (resource.endsWith(".woff2")) mime = "font/woff2";
        else if (resource.endsWith(".woff")) mime = "font/woff";
        else if (resource.endsWith(".mp3")) mime = "audio/mpeg";
        else if (resource.endsWith(".ogg")) mime = "audio/ogg";
        else if (resource.endsWith(".wav")) mime = "audio/wav";
        try {
            return new WebResourceResponse(mime, "UTF-8", 200, "OK",
                Collections.singletonMap("X-Content-Type-Options", "nosniff"), getAssets().open(resource.substring(1)));
        } catch (IOException missing) { return missingResource(); }
    }
    private boolean sameOrigin(Uri uri) {
        return "https".equals(uri.getScheme()) && uri.getHost() != null &&
            uri.getHost().equalsIgnoreCase(trustedOrigin.getHost()) && uri.getPort() == trustedOrigin.getPort();
    }
    private void fullscreen() {
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams layout = getWindow().getAttributes();
            layout.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(layout);
        }
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }
    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) fullscreen();
    }
    private void showError(String message) {
        if (isFinishing() || leaving) return;
        leaving = true;
        new AlertDialog.Builder(this).setTitle("MAXBALL").setMessage(message)
            .setPositiveButton("Tentar novamente", (dialog, which) -> { leaving = false; game.loadUrl(startUrl); })
            .setNegativeButton("Jogar local", (dialog, which) -> { leaving = false; game.loadUrl(LOCAL_URL); })
            .setOnCancelListener(dialog -> leaving = false).show();
    }
    @Override public void onBackPressed() {
        game.evaluateJavascript("(function(){var d=document.querySelector('dialog[open]');if(d){d.close();d.remove();return true;}var p=document.querySelector('#portal.on');if(p){document.querySelector('#portal-home').click();return true;}var g=document.querySelector('#game.on');if(g){document.querySelector('#exit').click();return true;}return false;})()", result -> {
            if ("true".equals(result)) return;
            new AlertDialog.Builder(this).setTitle("Sair do MAXBALL?")
                .setNegativeButton("Continuar", null).setPositiveButton("Fechar", (d, w) -> finish()).show();
        });
    }
    @Override protected void onPause() {
        game.evaluateJavascript("window.dispatchEvent(new Event('maxball:native-pause'));window.dispatchEvent(new Event('blur'));window.MaxballGame&&window.MaxballGame.resetInputs();", null);
        game.onPause();game.pauseTimers();CookieManager.getInstance().flush();super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();if(game!=null){game.resumeTimers();game.onResume();fullscreen();game.evaluateJavascript("window.dispatchEvent(new Event('maxball:native-resume'));",null);}
    }
    @Override protected void onDestroy() {
        if(game!=null){game.stopLoading();game.loadUrl("about:blank");game.destroy();game=null;}super.onDestroy();
    }
}
