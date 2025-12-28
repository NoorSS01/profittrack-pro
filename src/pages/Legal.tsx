import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, FileText, Ban, AlertTriangle, Mail, Info, Cookie } from "lucide-react";
import { cn } from "@/lib/utils";

type LegalPageType = "privacy" | "terms" | "refund" | "disclaimer" | "contact" | "about" | "cookies";

const legalContent: Record<LegalPageType, { title: string; icon: any; content: JSX.Element }> = {
  privacy: {
    title: "Privacy Policy",
    icon: Shield,
    content: (
      <div className="space-y-6 text-sm text-muted-foreground">
        <p className="text-foreground font-medium">Last updated: January 2025</p>
        
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">1. Information We Collect</h3>
          <p>TransportPro collects information you provide directly to us, including:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Account information (email address, name, phone number)</li>
            <li>Business information (business name, vehicle details)</li>
            <li>Trip and expense data you enter into the application</li>
            <li>Payment information for subscription services</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">2. How We Use Your Information</h3>
          <p>We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Analyze usage patterns to improve user experience</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">3. Data Security</h3>
          <p>We implement appropriate security measures to protect your personal information. Your data is stored securely using industry-standard encryption and security protocols. We use Supabase for secure data storage with row-level security policies.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">4. Data Retention</h3>
          <p>We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time by contacting our support team.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">5. Third-Party Services</h3>
          <p>We may use third-party services that collect, monitor, and analyze data to improve our service. These include:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Supabase (Authentication and Database)</li>
            <li>Google AI (AI Assistant features)</li>
            <li>Payment processors for subscription handling</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">6. Your Rights</h3>
          <p>You have the right to access, update, or delete your personal information at any time through your account settings or by contacting us.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">7. Contact Us</h3>
          <p>If you have questions about this Privacy Policy, please contact us at support@transportpro.app</p>
        </section>
      </div>
    ),
  },
  terms: {
    title: "Terms & Conditions",
    icon: FileText,
    content: (
      <div className="space-y-6 text-sm text-muted-foreground">
        <p className="text-foreground font-medium">Last updated: January 2025</p>
        
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h3>
          <p>By accessing and using TransportPro, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our service.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">2. Description of Service</h3>
          <p>TransportPro is a transport business management platform that helps fleet owners and transport businesses track their vehicles, trips, expenses, and profits. The service includes:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Vehicle management and tracking</li>
            <li>Daily trip entry and expense logging</li>
            <li>Profit and loss reports</li>
            <li>AI-powered business insights (on eligible plans)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">3. User Accounts</h3>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating an account.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">4. Subscription Plans</h3>
          <p>TransportPro offers various subscription plans with different features and limitations. By subscribing to a plan, you agree to pay the applicable fees. Subscription fees are billed in advance on a monthly or yearly basis.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">5. Acceptable Use</h3>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Use the service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to any part of the service</li>
            <li>Interfere with or disrupt the service</li>
            <li>Share your account credentials with others</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">6. Intellectual Property</h3>
          <p>All content, features, and functionality of TransportPro are owned by us and are protected by copyright, trademark, and other intellectual property laws.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">7. Limitation of Liability</h3>
          <p>TransportPro shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">8. Changes to Terms</h3>
          <p>We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the application.</p>
        </section>
      </div>
    ),
  },
  refund: {
    title: "Refund & Cancellation Policy",
    icon: Ban,
    content: (
      <div className="space-y-6 text-sm text-muted-foreground">
        <p className="text-foreground font-medium">Last updated: January 2025</p>
        
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">No Refund Policy</h3>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-foreground font-medium">Due to the digital nature of our services, all payments made for TransportPro subscriptions are final and non-refundable.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Why We Don't Offer Refunds</h3>
          <p>TransportPro is a digital software service that provides immediate access to all features upon subscription. Once you subscribe:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>You gain instant access to all plan features</li>
            <li>Your data storage and processing begins immediately</li>
            <li>Server resources are allocated for your account</li>
          </ul>
          <p className="mt-2">As these resources cannot be "returned" like physical goods, we are unable to process refunds.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Free Trial</h3>
          <p>We offer a 15-day free trial for all new users. During this period, you have full access to explore all features of TransportPro. We strongly encourage you to thoroughly evaluate the service during your trial period before making a purchase decision.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Subscription Cancellation</h3>
          <p>You may cancel your subscription at any time. Upon cancellation:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Your subscription will remain active until the end of the current billing period</li>
            <li>You will not be charged for subsequent billing periods</li>
            <li>Your data will be retained for 30 days after subscription expiry</li>
            <li>No partial refunds will be issued for unused time</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Exceptional Circumstances</h3>
          <p>In rare cases of technical issues on our end that prevent you from using the service for an extended period, we may consider providing service credits or subscription extensions at our sole discretion. Please contact our support team to discuss such situations.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Contact Us</h3>
          <p>If you have any questions about our refund policy, please contact us at support@transportpro.app before making a purchase.</p>
        </section>
      </div>
    ),
  },
  disclaimer: {
    title: "Disclaimer",
    icon: AlertTriangle,
    content: (
      <div className="space-y-6 text-sm text-muted-foreground">
        <p className="text-foreground font-medium">Last updated: January 2025</p>
        
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">General Disclaimer</h3>
          <p>The information provided by TransportPro is for general informational and business management purposes only. While we strive to provide accurate calculations and reports, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, or suitability of the information.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Financial Information</h3>
          <p>TransportPro provides tools for tracking expenses, earnings, and profits. However:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>The calculations are based on data you enter and may not reflect actual financial performance</li>
            <li>Our reports should not be used as the sole basis for financial or tax decisions</li>
            <li>We recommend consulting with a qualified accountant or financial advisor for official financial matters</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">AI Assistant</h3>
          <p>The AI Assistant feature provides suggestions and insights based on your data. These suggestions are generated by artificial intelligence and should be considered as guidance only, not professional advice. Always verify important decisions with qualified professionals.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Service Availability</h3>
          <p>While we strive to maintain high availability, we do not guarantee uninterrupted access to TransportPro. The service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Data Accuracy</h3>
          <p>You are responsible for the accuracy of data entered into TransportPro. We are not liable for any errors, omissions, or decisions made based on inaccurate data entry.</p>
        </section>
      </div>
    ),
  },
  contact: {
    title: "Contact & Support",
    icon: Mail,
    content: (
      <div className="space-y-6 text-sm text-muted-foreground">
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Get in Touch</h3>
          <p>We're here to help! If you have any questions, concerns, or feedback about TransportPro, please don't hesitate to reach out.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Support Email</h3>
          <div className="bg-primary/10 rounded-lg p-4">
            <p className="text-foreground font-medium">support@transportpro.app</p>
            <p className="text-xs mt-1">We typically respond within 24-48 hours</p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Support Hours</h3>
          <p>Our support team is available:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Monday to Friday: 9:00 AM - 6:00 PM IST</li>
            <li>Saturday: 10:00 AM - 2:00 PM IST</li>
            <li>Sunday: Closed</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Priority Support</h3>
          <p>Ultra plan subscribers receive priority support with faster response times and dedicated assistance for complex issues.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Before Contacting Support</h3>
          <p>To help us assist you better, please include:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Your registered email address</li>
            <li>A clear description of your issue or question</li>
            <li>Screenshots if applicable</li>
            <li>Steps to reproduce the issue (for technical problems)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Feedback</h3>
          <p>We value your feedback! If you have suggestions for improving TransportPro, please share them with us. Your input helps us make the service better for everyone.</p>
        </section>
      </div>
    ),
  },
  about: {
    title: "About Us",
    icon: Info,
    content: (
      <div className="space-y-6 text-sm text-muted-foreground">
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Our Mission</h3>
          <p>TransportPro was created with a simple mission: to help transport business owners manage their operations more efficiently and maximize their profits. We understand the challenges of running a transport business and have built a solution that simplifies daily operations.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">What We Do</h3>
          <p>TransportPro is a comprehensive transport business management platform that helps you:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Track multiple vehicles and their performance</li>
            <li>Log daily trips, fuel expenses, and other costs</li>
            <li>Generate detailed profit and loss reports</li>
            <li>Get AI-powered insights to optimize your business</li>
            <li>Access your data anytime, anywhere</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Our Values</h3>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><span className="text-foreground font-medium">Simplicity:</span> Easy-to-use interface designed for busy business owners</li>
            <li><span className="text-foreground font-medium">Reliability:</span> Secure and dependable platform you can count on</li>
            <li><span className="text-foreground font-medium">Innovation:</span> Continuously improving with new features and AI capabilities</li>
            <li><span className="text-foreground font-medium">Support:</span> Dedicated customer support to help you succeed</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Technology</h3>
          <p>TransportPro is built using modern, secure technologies including React, TypeScript, and Supabase. Our platform is designed to be fast, reliable, and accessible on any device.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Join Us</h3>
          <p>Join thousands of transport business owners who trust TransportPro to manage their operations. Start your free trial today and experience the difference.</p>
        </section>
      </div>
    ),
  },
  cookies: {
    title: "Cookie Policy",
    icon: Cookie,
    content: (
      <div className="space-y-6 text-sm text-muted-foreground">
        <p className="text-foreground font-medium">Last updated: January 2025</p>
        
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">What Are Cookies</h3>
          <p>Cookies are small text files that are stored on your device when you visit a website. They help the website remember your preferences and improve your browsing experience.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">How We Use Cookies</h3>
          <p>TransportPro uses cookies for the following purposes:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><span className="text-foreground font-medium">Essential Cookies:</span> Required for the application to function properly, including authentication and session management</li>
            <li><span className="text-foreground font-medium">Preference Cookies:</span> Remember your settings like currency preference and display options</li>
            <li><span className="text-foreground font-medium">Analytics Cookies:</span> Help us understand how users interact with our application to improve the service</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Local Storage</h3>
          <p>In addition to cookies, we use browser local storage to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Store your authentication session securely</li>
            <li>Save your application preferences</li>
            <li>Cache data for offline functionality (PWA)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Third-Party Cookies</h3>
          <p>Some third-party services we use may set their own cookies:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Supabase (authentication provider)</li>
            <li>Google (for Google Sign-In functionality)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Managing Cookies</h3>
          <p>You can control and manage cookies through your browser settings. However, please note that disabling essential cookies may affect the functionality of TransportPro.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Contact Us</h3>
          <p>If you have questions about our use of cookies, please contact us at support@transportpro.app</p>
        </section>
      </div>
    ),
  },
};

const Legal = () => {
  const navigate = useNavigate();
  const { page } = useParams<{ page: string }>();
  
  const pageType = page as LegalPageType;
  const content = legalContent[pageType];

  if (!content) {
    navigate("/account");
    return null;
  }

  const Icon = content.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => navigate("/account")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">{content.title}</h1>
      </div>

      {/* Content Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5 text-primary" />
            {content.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {content.content}
        </CardContent>
      </Card>

      {/* Back to Account */}
      <div className="text-center">
        <Button variant="ghost" onClick={() => navigate("/account")}>
          ← Back to Account
        </Button>
      </div>
    </div>
  );
};

export default Legal;
