<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>AutoToRental.com — XML Sitemap</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <style>
          body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:13px; color:#111; margin:0; padding:0; background:#f8faff; }
          #header { background: linear-gradient(135deg,#1753b0,#0ea5e9); color:#fff; padding:28px 32px; }
          #header h1 { margin:0; font-size:22px; font-weight:800; }
          #header p { margin:6px 0 0; font-size:13px; opacity:0.8; }
          #content { padding:24px 32px; }
          table { width:100%; border-collapse:collapse; background:#fff; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,.08); overflow:hidden; }
          th { background:#1753b0; color:#fff; text-align:left; padding:12px 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
          td { padding:10px 16px; border-bottom:1px solid #e5e7eb; font-size:12px; }
          tr:last-child td { border-bottom:none; }
          tr:hover td { background:#f0f4ff; }
          a { color:#1753b0; text-decoration:none; }
          a:hover { text-decoration:underline; }
          .badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:600; }
          .daily { background:#dcfce7; color:#166534; }
          .weekly { background:#dbeafe; color:#1e40af; }
          .monthly { background:#fef9c3; color:#854d0e; }
          .p1 { color:#16a34a; font-weight:700; }
          .p09 { color:#2563eb; }
          .p08 { color:#6b7280; }
          .count { font-size:12px; color:#6b7280; margin-top:4px; }
        </style>
      </head>
      <body>
        <div id="header">
          <h1>🗺️ AutoToRental.com — XML Sitemap</h1>
          <p><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs indexed · Generated for Google Search Console</p>
        </div>
        <div id="content">
          <table>
            <tr>
              <th>URL</th>
              <th>Last Modified</th>
              <th>Frequency</th>
              <th>Priority</th>
            </tr>
            <xsl:for-each select="sitemap:urlset/sitemap:url">
              <tr>
                <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                <td><xsl:value-of select="substring(sitemap:lastmod,0,11)"/></td>
                <td><span class="badge {@changefreq}"><xsl:value-of select="sitemap:changefreq"/></span></td>
                <td>
                  <xsl:choose>
                    <xsl:when test="sitemap:priority = '1.0'"><span class="p1">1.0 ★</span></xsl:when>
                    <xsl:when test="sitemap:priority = '0.9'"><span class="p09">0.9</span></xsl:when>
                    <xsl:otherwise><span class="p08"><xsl:value-of select="sitemap:priority"/></span></xsl:otherwise>
                  </xsl:choose>
                </td>
              </tr>
            </xsl:for-each>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
