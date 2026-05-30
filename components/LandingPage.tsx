import React from 'react';
import { Button } from '@/components/ui/button';
import { Network, Smartphone, Clock, PieChart, ServerCrash, CreditCard, ShieldCheck, Phone, Handshake, CheckCircle2, TrendingUp, ArrowLeft } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans" dir="rtl">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Network className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-[#163C85]">OrderFlow</span>
          </div>
          <div>
            <Button onClick={onLoginClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-full">
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#F0F2F5] to-white">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-[#2E5CA6] text-sm font-bold mb-4">
              <TrendingUp className="w-4 h-4" /> المنصة الأسرع نمواً لإدارة المبيعات
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-[#163C85] leading-tight tracking-tight">
              OrderFlow: مستقبلك في إدارة<br className="hidden md:block" /> المبيعات الذكية.
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              المنصة المتكاملة لإدارة التجارة متعددة المستأجرين، المدعومة بالذكاء الاصطناعي لتبسيط تدفق الطلبات، تتبع المبيعات، وتعزيز علاقات العملاء في مكان واحد.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Button onClick={onLoginClick} className="h-14 px-8 bg-[#2E5CA6] hover:bg-[#163C85] text-white text-lg font-bold rounded-full shadow-lg shadow-blue-200 transition-all hover:scale-105">
                ابدأ الآن - تسجيل الدخول
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* Core Capabilities */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-[#163C85] mb-4">مميزات القوة والذكاء</h2>
              <p className="text-lg text-gray-500">تقنيات متطورة تعيد تعريف طريقة إدارتك لمبيعاتك</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-[#F0F2F5] rounded-3xl p-8 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <PieChart className="w-7 h-7 text-[#2E5CA6]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">مساعد الوصف الذكي (AI)</h3>
                <p className="text-gray-600 leading-relaxed">
                  لا تضيع وقتك في كتابة أوصاف المنتجات؛ دع محرك الذكاء الاصطناعي لدينا ينشئ لك أوصافاً إبداعية ومحسنة لمحركات البحث بناءً على بيانات منتجك.
                </p>
              </div>
              <div className="bg-[#F0F2F5] rounded-3xl p-8 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <ServerCrash className="w-7 h-7 text-[#2E5CA6]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">العمل بلا حدود (Offline Mode)</h3>
                <p className="text-gray-600 leading-relaxed">
                  سجل طلباتك، أضف عملائك، وتابع عملك حتى بدون إنترنت. سيقوم OrderFlow بمزامنة كل شيء تلقائياً بمجرد عودتك للشبكة.
                </p>
              </div>
              <div className="bg-[#F0F2F5] rounded-3xl p-8 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <TrendingUp className="w-7 h-7 text-[#2E5CA6]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">لوحة تحكم وتحليلات حية</h3>
                <p className="text-gray-600 leading-relaxed">
                  راقب أداء مبيعاتك اليومية، وتتبع متوسطات البيع حسب العملات المختلفة في واجهة تفاعلية واحدة ومنظمة.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Custom Solutions */}
        <section className="py-20 bg-[#163C85] text-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black mb-4">حلول مخصصة تناسب أعمالك</h2>
              <p className="text-blue-200 text-lg">من الإدارة إلى العملاء، تجربة سلسة لكل مستخدم</p>
            </div>

            <div className="grid md:grid-cols-2 gap-16 items-center">
              {/* For Admins & Sales */}
              <div className="space-y-8">
                <div className="inline-block px-4 py-2 bg-white/10 rounded-full text-blue-100 font-bold border border-white/20">
                  لأصحاب الشركات والإدارة (Admin & Sales)
                </div>
                <ul className="space-y-6">
                  <li className="flex gap-4 items-start">
                    <div className="mt-1 bg-blue-500/30 p-2 rounded-lg"><CreditCard className="w-6 h-6 text-white" /></div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">إدارة مالية متعددة العملات</h4>
                      <p className="text-blue-100 leading-relaxed">بع عملاتك المفضلة وتابع إجمالياتك بالعملة الرئيسية للشركة بفضل نظام تحويل العملات المرن.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <div className="mt-1 bg-blue-500/30 p-2 rounded-lg"><PieChart className="w-6 h-6 text-white" /></div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">نظام عروض وبونص متطور</h4>
                      <p className="text-blue-100 leading-relaxed">صمم خطط بونص مرنة (ثابتة أو شرائح حسب الكمية) لتحفيز المبيعات بشكل تلقائي وفعال.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <div className="mt-1 bg-blue-500/30 p-2 rounded-lg"><Phone className="w-6 h-6 text-white" /></div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">توثيق المكالمات الواردة</h4>
                      <p className="text-blue-100 leading-relaxed">اربط مكالمات العملاء بملفاتهم الشخصية وسجل طلباتهم مباشرة لضمان عدم ضياع أي تفصيل.</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* For Clients */}
              <div className="bg-white rounded-3xl p-8 md:p-10 text-gray-900 shadow-2xl relative">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-green-500 text-white px-6 py-2 rounded-full font-bold shadow-lg transform rotate-3">
                  تجربة مريحة للعميل
                </div>
                <div className="inline-block px-4 py-2 bg-green-100 rounded-full text-green-800 font-bold mb-6">
                  للعملاء (Client Portal)
                </div>
                <ul className="space-y-8">
                  <li className="flex gap-4 items-start">
                    <div className="mt-1 bg-green-100 p-3 rounded-2xl"><Smartphone className="w-6 h-6 text-green-600" /></div>
                    <div>
                      <h4 className="text-xl font-bold mb-2 text-green-900">بوابة الخدمة الذاتية</h4>
                      <p className="text-gray-600 leading-relaxed">واجهة مخصصة باللون الأخضر المريح تتيح لعملائك تصفح المنتجات، وتقديم الطلبات، ومتابعة سجلهم المالي بشكل مستقل.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <div className="mt-1 bg-green-100 p-3 rounded-2xl"><Clock className="w-6 h-6 text-green-600" /></div>
                    <div>
                      <h4 className="text-xl font-bold mb-2 text-green-900">تنبيهات فورية</h4>
                      <p className="text-gray-600 leading-relaxed">ابقِ عملائك على اطلاع دائم بحالة طلباتهم ومواعيد سداد الفواتير عبر نظام إشعارات ذكي.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* UI/UX & Security */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <ShieldCheck className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">أمان فائق وعزل للبيانات</h3>
                <p className="text-gray-600">بيانات شركتك محمية بأعلى معايير الأمان، مع عزل تام يضمن خصوصية بيانات كل شركة بشكل مستقل.</p>
              </div>
              <div className="text-center p-6 border-x border-gray-100">
                <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Handshake className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">تصميم احترافي ومرن</h3>
                <p className="text-gray-600">واجهات مصممة بعناية لتعكس الثقة والموثوقية، بمرونة تامة وتعمل بسلاسة على الهواتف الأجهزة اللوحية والحواسيب.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">دقة المواقع الجغرافية</h3>
                <p className="text-gray-600">ربط متكامل مع خرائط جوجل لضمان وصول مندوبيك وعملائك إلى العناوين الصحيحة بدقة متناهية وسهولة تامة.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-gradient-to-t from-[#F0F2F5] to-white relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-64 bg-blue-600 opacity-5 blur-3xl transform -skew-y-6"></div>
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 relative z-10">
            <h2 className="text-4xl font-black text-[#163C85] mb-6">هل أنت مستعد لتنظيم تدفق مبيعاتك؟</h2>
            <p className="text-xl text-gray-600 mb-10">انضم إلى OrderFlow اليوم واختبر الكفاءة في كل طلب وفي كل عملية بيع.</p>
            <Button onClick={onLoginClick} className="h-16 px-10 bg-[#2E5CA6] hover:bg-[#163C85] text-white text-xl font-bold rounded-full shadow-2xl transition-transform hover:scale-105">
              ابدأ الآن - تسجيل الدخول
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 text-center text-gray-500">
        <p>© 2026 OrderFlow - المنصة المتكاملة لإدارة التجارة</p>
      </footer>
    </div>
  );
}
