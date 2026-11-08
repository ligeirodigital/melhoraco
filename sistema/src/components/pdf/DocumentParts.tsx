import { Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { documentFooter, type DocumentSettings } from "@/lib/documents";

/** Shared look for quote and receipt PDFs (react-pdf, loaded lazily). */
export const DOC = {
  ink: "#0f172a",
  steel: "#1e3a5f",
  accent: "#e97316",
  muted: "#64748b",
  line: "#e2e8f0",
  soft: "#f1f5f9",
};

export const doc = StyleSheet.create({
  page: { paddingTop: 32, paddingHorizontal: 32, paddingBottom: 64, fontFamily: "Helvetica", fontSize: 11, color: DOC.ink },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 14, borderBottomWidth: 3, borderBottomColor: DOC.accent, marginBottom: 18 },
  logo: { width: 52, height: 52, borderRadius: 10, objectFit: "contain" },
  company: { fontSize: 16, fontFamily: "Helvetica-Bold", color: DOC.steel },
  companySub: { fontSize: 9, color: DOC.muted, marginTop: 2 },
  docTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: DOC.ink },
  docNumber: { fontSize: 10, color: DOC.muted, marginTop: 3 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DOC.steel, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  box: { padding: 12, backgroundColor: DOC.soft, borderRadius: 8, marginBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  label: { fontSize: 11, color: DOC.muted },
  value: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  highlight: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 10, backgroundColor: DOC.steel, marginBottom: 14 },
  highlightLabel: { fontSize: 10, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: 1 },
  highlightValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, borderTopWidth: 1, borderTopColor: DOC.line, paddingTop: 8 },
  footerText: { fontSize: 8, color: DOC.muted, textAlign: "center", lineHeight: 1.4 },
});

export function DocHeader({ settings, logoUrl, title, number }: { settings: DocumentSettings; logoUrl?: string; title: string; number: string }) {
  return (
    <View>
      <View style={doc.header}>
        {logoUrl ? <Image src={logoUrl} style={doc.logo} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={doc.company}>{settings.company_name}</Text>
          <Text style={doc.companySub}>{settings.tagline}</Text>
          <Text style={doc.companySub}>{settings.address}</Text>
          {settings.whatsapp ? <Text style={doc.companySub}>WhatsApp: {settings.whatsapp}</Text> : null}
        </View>
      </View>
      <View style={{ marginBottom: 14 }}>
        <Text style={doc.docTitle}>{title}</Text>
        <Text style={doc.docNumber}>{number}</Text>
      </View>
    </View>
  );
}

export function DocFooter({ settings, note }: { settings: DocumentSettings; note?: string }) {
  return (
    <View style={doc.footer} fixed>
      {note ? <Text style={doc.footerText}>{note}</Text> : null}
      <Text style={doc.footerText}>{documentFooter(settings)}</Text>
    </View>
  );
}
