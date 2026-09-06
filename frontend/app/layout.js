import "./globals.css";
import { AuthProvider } from "../lib/auth";

export const metadata = {
  title: "nova-link",
  description: "Project discussion, wired into your terminal.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
