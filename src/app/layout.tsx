import { Metadata, Viewport } from "next";
import Script from "next/script";
import { Providers } from "./providers";
import Layout from "../components/Layout/Layout";
import "../index.css";

export const viewport: Viewport = {
  themeColor: "#000050",
};

export const metadata: Metadata = {
  title: "엔피맵+",
  description: "엔피맵+는 엔피아들을 위한 다양한 공연 정보와 커뮤니티 컨텐츠를 제공하는 사이트입니다.",
  keywords: ["엔피맵", "N.Flying", "엔피아", "공연 정보", "팬 커뮤니티", "음악", "엔피맵+"],
  authors: [{ name: "N.Flying Fans Community" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/image/logo/logo_nfi.svg", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.ico",
    apple: "/image/logo/logo_nfi.svg",
  },
  manifest: "/manifest.json",
  other: {
    "google-adsense-account": "ca-pub-9930063202483530",
  },
  twitter: {
    card: "summary_large_image",
    title: "엔피맵+ - 엔피아를 위한 컨텐츠 사이트",
    description: "엔피맵+는 엔피아들을 위한 다양한 공연 정보와 커뮤니티 컨텐츠를 제공하는 사이트입니다.",
    images: ["/image/logo/logo_nfi.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
        {/* Google Tag Manager */}
        <Script id="gtm-script" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-PC88S78Q');
          `}
        </Script>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VHMLG5LQT1"
          strategy="afterInteractive"
        />
        <Script id="ga-script" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VHMLG5LQT1');
          `}
        </Script>
        {/* Naver Analytics */}
        <Script
          src="//wcs.naver.net/wcslog.js"
          strategy="afterInteractive"
        />
        <Script id="naver-script" strategy="afterInteractive">
          {`
            if(!window.wcs_add) window.wcs_add = {};
            window.wcs_add["wa"] = "fdbc51d5421358";
            if(window.wcs) {
              window.wcs.do();
            }
          `}
        </Script>
        {/* Google AdSense */}
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9930063202483530"
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
        {/* Kakao SDK */}
        <Script
          src="https://developers.kakao.com/sdk/js/kakao.min.js"
          strategy="afterInteractive"
        />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PC88S78Q"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
