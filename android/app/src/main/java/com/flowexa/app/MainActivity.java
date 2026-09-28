package com.flowexa.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import androidx.activity.OnBackPressedCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private LinearLayout offlineBanner;
    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private boolean pageLoaded = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        offlineBanner = findViewById(R.id.offlineBanner);
        connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(isOnline() ? WebSettings.LOAD_DEFAULT : WebSettings.LOAD_CACHE_ELSE_NETWORK);
        String ua = settings.getUserAgentString();
        settings.setUserAgentString(ua + " FlowexaApp/1.0");

        if (WebViewFeature.isFeatureSupported(WebViewFeature.OFF_SCREEN_PRERASTER)) {
            WebSettingsCompat.setOffscreenPreRaster(settings, true);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageLoaded = true;
                swipeRefresh.setRefreshing(false);
                view.evaluateJavascript(
                    "window.dispatchEvent(new Event(navigator.onLine ? 'online' : 'offline'));",
                    null
                );
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame() && !isOnline()) {
                    offlineBanner.setVisibility(View.VISIBLE);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient());

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
        if (connectivityManager != null && networkCallback != null) {
            try {
                connectivityManager.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {
            }
        }
        super.onDestroy();
    }
}
