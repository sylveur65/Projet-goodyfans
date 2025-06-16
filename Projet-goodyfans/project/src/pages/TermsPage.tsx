import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft, Shield, CreditCard, Eye, UserCheck } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-700">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center text-white hover:text-purple-200 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Terms & Conditions</h1>
          <p className="text-purple-200">GoodyFans Platform Agreement</p>
          <p className="text-sm text-purple-300 mt-2">Last updated: January 2024</p>
        </div>

        {/* Content */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="p-8 space-y-8">
            {/* Quick Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Privacy Protected</h3>
                <p className="text-sm text-gray-600">Your data is secure</p>
              </div>
              <div className="text-center p-4 bg-pink-50 rounded-xl">
                <CreditCard className="w-8 h-8 text-pink-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Secure Payments</h3>
                <p className="text-sm text-gray-600">Stripe integration</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <Eye className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Content Control</h3>
                <p className="text-sm text-gray-600">You own your content</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <UserCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Age Verification</h3>
                <p className="text-sm text-gray-600">18+ platform only</p>
              </div>
            </div>

            {/* Terms Content */}
            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  By accessing and using the GoodyFans platform ("Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  These Terms of Service constitute a legally binding agreement between you and GoodyFans regarding your use of the Platform. You must be at least 18 years old to use this platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. User Accounts and Roles</h2>
                <div className="bg-gray-50 p-6 rounded-xl mb-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Creator Accounts</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Must be 18+ years of age with valid identification</li>
                    <li>Responsible for all content uploaded to the platform</li>
                    <li>Must comply with content guidelines and community standards</li>
                    <li>Agree to revenue sharing terms (platform takes 15% commission)</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="font-semibold text-gray-900 mb-3">Buyer Accounts</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Must be 18+ years of age</li>
                    <li>Responsible for all purchases made through the platform</li>
                    <li>May not redistribute or share purchased content</li>
                    <li>Must respect creators' intellectual property rights</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Content Guidelines</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  All content uploaded to the platform must comply with our community guidelines:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                  <li>Content must be original or properly licensed</li>
                  <li>No illegal, harmful, or offensive material</li>
                  <li>No copyright infringement or unauthorized use of third-party content</li>
                  <li>Content must comply with applicable laws and regulations</li>
                  <li>Platform reserves the right to remove content that violates guidelines</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Payment and Billing</h2>
                <div className="bg-blue-50 p-6 rounded-xl mb-4">
                  <h3 className="font-semibold text-gray-900 mb-3">For Creators</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Platform fee: 15% of gross sales</li>
                    <li>Payments processed via Stripe Connect</li>
                    <li>Minimum payout threshold: $50</li>
                    <li>Payouts processed weekly on Fridays</li>
                  </ul>
                </div>
                <div className="bg-purple-50 p-6 rounded-xl">
                  <h3 className="font-semibold text-gray-900 mb-3">For Buyers</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>All purchases are final and non-refundable</li>
                    <li>Payments processed securely through Stripe</li>
                    <li>Access to purchased content is permanent</li>
                    <li>No subscription fees for basic account access</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Privacy and Data Protection</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We take your privacy seriously and are committed to protecting your personal information:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Personal data is encrypted and securely stored</li>
                  <li>We do not sell or share personal information with third parties</li>
                  <li>Payment information is processed securely through Stripe</li>
                  <li>You can request deletion of your account and associated data</li>
                  <li>We comply with GDPR and other applicable privacy regulations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Intellectual Property</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Content creators retain ownership of their intellectual property while granting the platform limited rights:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Creators maintain copyright ownership of their content</li>
                  <li>Platform receives limited license to display and distribute content</li>
                  <li>Buyers receive personal, non-commercial use rights only</li>
                  <li>Redistribution or commercial use of purchased content is prohibited</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Prohibited Activities</h2>
                <div className="bg-red-50 p-6 rounded-xl">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    The following activities are strictly prohibited on the platform:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Uploading illegal, harmful, or offensive content</li>
                    <li>Harassment, bullying, or threatening behavior</li>
                    <li>Copyright infringement or unauthorized content use</li>
                    <li>Attempting to circumvent payment systems</li>
                    <li>Creating fake accounts or impersonating others</li>
                    <li>Spamming or engaging in fraudulent activities</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Account Termination</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We reserve the right to suspend or terminate accounts that violate these terms:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Immediate termination for serious violations</li>
                  <li>Warning system for minor infractions</li>
                  <li>Users may appeal account actions</li>
                  <li>Refunds not guaranteed for terminated accounts</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
                <p className="text-gray-700 leading-relaxed">
                  GoodyFans shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to Terms</h2>
                <p className="text-gray-700 leading-relaxed">
                  We reserve the right to modify these terms at any time. Users will be notified of significant changes via email and/or platform notifications. Continued use of the platform after changes constitutes acceptance of the new terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Information</h2>
                <div className="bg-gray-50 p-6 rounded-xl">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    If you have any questions about these Terms of Service, please contact us:
                  </p>
                  <ul className="text-gray-700 space-y-1">
                    <li><strong>Email:</strong> support@goodyfans.com</li>
                    <li><strong>Address:</strong> GoodyFans Legal Department</li>
                    <li><strong>Response Time:</strong> Within 48 hours</li>
                  </ul>
                </div>
              </section>
            </div>

            {/* Agreement Checkbox */}
            <div className="border-t border-gray-200 pt-8">
              <div className="flex items-start space-x-3 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                <input
                  type="checkbox"
                  id="terms-agreement"
                  className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="terms-agreement" className="text-sm text-gray-700">
                  <span className="font-medium">I acknowledge that I have read, understood, and agree to be bound by these Terms and Conditions.</span>
                  {' '}By checking this box, I confirm that I am at least 18 years of age and have the legal authority to enter into this agreement.
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 pt-6">
              <Link
                to="/signup"
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-center"
              >
                I Agree - Create Account
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};