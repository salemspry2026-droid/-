package com.flowexa.app;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.ProgressBar;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private LinearLayout offlineBanner;
    private LinearLayout splashOverlay;
    private ProgressBar pageProgressBar;
    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private boolean pageLoaded = false;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Switch from Splash theme to standard App theme
        setTheme(R.style.Theme_Flowexa);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        offlineBanner = findViewById(R.id.offlineBanner);
        splashOverlay = findViewById(R.id.splashOverlay);
        pageProgressBar = findViewById(R.id.pageProgressBar);
        connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);

        // Keep cookies enabled and synchronized for Firebase Auth persistence
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(isOnline() ? WebSettings.LOAD_DEFAULT : WebSettings.LOAD_CACHE_ELSE_NETWORK);

        // Enable multi-window for popup authentication flows (Google Sign-In)
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        // Clean User-Agent: remove "; wv" so Google OAuth does not block with 403 disallowed_useragent
        String defaultUa = settings.getUserAgentString();
        String cleanUa = defaultUa.replace("; wv", "");
        settings.setUserAgentString(cleanUa);

        if (WebViewFeature.isFeatureSupported(WebViewFeature.OFF_SCREEN_PRERASTER)) {
            WebSettingsCompat.setOffscreenPreRaster(settings, true);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri == null) return false;

                String scheme = uri.getScheme();
                String host = uri.getHost();

                // 1. Handle phone, email, sms
                if ("tel".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme) || "sms".equalsIgnoreCase(scheme)) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                        return true;
                    } catch (Exception ignored) {
                        return true;
                    }
                }

                // 2. Handle WhatsApp links
                if (host != null && (host.contains("whatsapp.com") || host.contains("wa.me") || "whatsapp".equalsIgnoreCase(scheme))) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                        return true;
                    } catch (Exception ignored) {
                        return false;
                    }
                }

                // 3. Keep internal domain and Firebase auth URLs in WebView
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageLoaded = true;
                swipeRefresh.setRefreshing(false);
                hideSplashOverlay();

                view.evaluateJavascript(
                    "window.dispatchEvent(new Event(navigator.onLine ? 'online' : 'offline'));",
                    null
                );
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    if (!isOnline()) {
                        offlineBanner.setVisibility(View.VISIBLE);
                    }
                    hideSplashOverlay();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (pageProgressBar != null) {
                    if (newProgress < 100) {
                        pageProgressBar.setVisibility(View.VISIBLE);
                        pageProgressBar.setProgress(newProgress);
                    } else {
                        pageProgressBar.setVisibility(View.GONE);
                    }
                }
                if (newProgress > 75 && !pageLoaded) {
                    hideSplashOverlay();
                }
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView newWebView = new WebView(MainActivity.this);
                WebSettings newSettings = newWebView.getSettings();
                newSettings.setJavaScriptEnabled(true);
                newSettings.setDomStorageEnabled(true);
                newSettings.setSupportMultipleWindows(true);
                newSettings.setJavaScriptCanOpenWindowsAutomatically(true);

                String ua = newSettings.getUserAgentString().replace("; wv", "");
                newSettings.setUserAgentString(ua);

                Dialog dialog = new Dialog(MainActivity.this, android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen);
                dialog.setContentView(newWebView, new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));
                dialog.show();

                newWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView window) {
                        dialog.dismiss();
                        window.destroy();
                    }
                });

                newWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        return false;
                    }
                });

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(newWebView);
                resultMsg.sendToTarget();
                return true;
            }
        });

        swipeRefresh.setColorSchemeColors(getResources().getColor(R.color.primary, getTheme()));
        swipeRefresh.setOnRefreshListener(this::reloadApp);

        registerNetworkCallback();

        Intent launchIntent = getIntent();
        if (launchIntent != null && launchIntent.getData() != null) {
            handleIncomingUri(launchIntent.getData());
        } else if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            loadApp();
        }
        updateOfflineBanner();

        // Safety timeout: ensure splash overlay is never stuck on screen for more than 4 seconds
        mainHandler.postDelayed(this::hideSplashOverlay, 4000);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }

    private void hideSplashOverlay() {
        if (splashOverlay != null && splashOverlay.getVisibility() == View.VISIBLE) {
            splashOverlay.animate()
                    .alpha(0f)
                    .setDuration(350)
                    .withEndAction(() -> splashOverlay.setVisibility(View.GONE));
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && intent.getData() != null) {
            handleIncomingUri(intent.getData());
        }
    }

    private void handleIncomingUri(Uri uri) {
        if (uri == null) return;
        String url = uri.toString();
        if (webView != null) {
            webView.loadUrl(url);
        }
    }

    private void loadApp() {
        webView.loadUrl(BuildConfig.WEB_URL);
    }

    private void reloadApp() {
        if (isOnline() || pageLoaded) {
            webView.reload();
        } else {
            loadApp();
        }
        updateOfflineBanner();
    }

    private boolean isOnline() {
        if (connectivityManager == null) return false;
        Network network = connectivityManager.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities caps = connectivityManager.getNetworkCapabilities(network);
        return caps != null && (
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        );
    }

    private void updateOfflineBanner() {
        offlineBanner.setVisibility(isOnline() ? View.GONE : View.VISIBLE);
    }

    private void registerNetworkCallback() {
        if (connectivityManager == null) return;
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) {
                runOnUiThread(() -> {
                    webView.getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
                    offlineBanner.setVisibility(View.GONE);
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new Event('online'));",
                        null
                    );
                    if (!pageLoaded) {
                        loadApp();
                    }
                });
            }

            @Override
            public void onLost(@NonNull Network network) {
                runOnUiThread(() -> {
                    webView.getSettings().setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
                    offlineBanner.setVisibility(View.VISIBLE);
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new Event('offline'));",
                        null
                    );
                });
            }
        };
        NetworkRequest request = new NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build();
        connectivityManager.registerNetworkCallback(request, networkCallback);
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        mainHandler.removeCallbacksAndMessages(null);
        if (connectivityManager != null && networkCallback != null) {
            try {
                connectivityManager.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {
            }
        }
        super.onDestroy();
    }
}
