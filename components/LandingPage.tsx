import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Network, Smartphone, Clock, PieChart, ServerCrash, CreditCard, ShieldCheck, Phone, Handshake, CheckCircle2, TrendingUp, ArrowLeft, Menu, X, LayoutDashboard, ShoppingBag, Users, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LandingPageProps {
  onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePreview, setActivePreview] = useState<'admin' | 'client'>('admin');

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { name: 'المميزات', id: 'features' },
    { name: 'الحلول', id: 'solutions' },
    { name: 'الأمان والتجربة', id: 'security' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900" dir="rtl">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <motion.div 
                whileHover={{ rotate: 15, scale: 1.1 }}
                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-200"
              >
                <Network className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-2xl font-black text-[#163C85] tracking-tight">OrderFlow</span>
            </div>
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                >
                  {link.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={onLoginClick} className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-full shadow-lg shadow-blue-200/50 transition-all hover:-translate-y-0.5">
              تسجيل الدخول
            </Button>
            
            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-2 text-gray-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
            >
              <div className="px-4 py-6 flex flex-col gap-4">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className="text-right text-lg text-gray-600 font-medium hover:text-blue-600"
                  >
                    {link.name}
                  </button>
                ))}
                <div className="pt-4 border-t border-gray-100">
                  <Button onClick={onLoginClick} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl">
                    تسجيل الدخول
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#F0F2F5] via-[#F8FAFC] to-white relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-8 relative z-10 max-w-4xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-bold mb-4 border border-blue-100 shadow-sm"
              >
                <TrendingUp className="w-4 h-4" /> المنصة الأسرع نمواً لإدارة المبيعات والتجارة
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl md:text-6xl lg:text-7xl font-black text-[#163C85] leading-[1.1] tracking-tight"
              >
                مستقبلك في إدارة<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">المبيعات الذكية</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl md:text-2xl text-gray-600 leading-relaxed font-medium"
              >
                المنصة المتكاملة لإدارة التجارة متعددة المستأجرين، المدعومة بالذكاء الاصطناعي لتبسيط تدفق الطلبات وتعزيز علاقات العملاء في واجهة واحدة.
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row justify-center gap-4 pt-8"
              >
                <Button onClick={onLoginClick} className="h-16 px-10 bg-[#2E5CA6] hover:bg-[#163C85] text-white text-xl font-bold rounded-full shadow-xl shadow-blue-600/20 transition-all hover:scale-105 hover:-translate-y-1">
                  ابدأ التجربة مجاناً
                  <ArrowLeft className="w-6 h-6 mr-3" />
                </Button>
                <Button variant="outline" onClick={() => scrollToSection('preview')} className="h-16 px-10 text-xl font-bold rounded-full border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                  استكشف الواجهات
                </Button>
              </motion.div>
            </div>

            {/* Dashboard Mockup Video/Image placeholder - Abstract representation */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-20 mx-auto max-w-5xl rounded-3xl overflow-hidden border border-gray-200 shadow-2xl shadow-blue-900/10 bg-white relative"
              id="preview"
            >
               <div className="h-12 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-400"></div>
                 <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                 <div className="w-3 h-3 rounded-full bg-green-400"></div>
                 <div className="mx-auto bg-white border border-gray-200 rounded-md h-6 w-1/3 max-w-sm flex items-center justify-center text-xs text-gray-400 font-mono">orderflow.app</div>
               </div>
               
               {/* Interactive Preview Switcher */}
               <div className="p-6 md:p-10 bg-gray-50/50">
                  <div className="flex justify-center mb-10">
                     <div className="bg-gray-100 p-1.5 rounded-2xl inline-flex shadow-inner">
                        <button 
                          onClick={() => setActivePreview('admin')}
                          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activePreview === 'admin' ? 'bg-white text-blue-700 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                          <LayoutDashboard className="w-4 h-4" /> لوحة تحكم الإدارة والمبيعات
                        </button>
                        <button 
                          onClick={() => setActivePreview('client')}
                          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activePreview === 'client' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                          <Store className="w-4 h-4" /> واجهة العميل للطلبات
                        </button>
                     </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {activePreview === 'admin' ? (
                       <motion.div 
                         key="admin-preview"
                         initial={{ opacity: 0, x: -20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: 20 }}
                         transition={{ duration: 0.3 }}
                         className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[400px]"
                       >
                         {/* Fake Admin Sidebar */}
                         <div className="w-full md:w-64 bg-[#163C85] p-6 text-white hidden md:block">
                            <div className="flex items-center gap-2 mb-10">
                              <Network className="w-6 h-6 text-blue-300" />
                              <span className="font-bold text-xl">لوحة الإدارة</span>
                            </div>
                            <div className="space-y-4">
                              <div className="h-10 bg-white/10 rounded-lg flex items-center px-4 gap-3 text-blue-100"><LayoutDashboard className="w-4 h-4" /> نظرة عامة</div>
                              <div className="h-10 hover:bg-white/5 rounded-lg flex items-center px-4 gap-3 text-blue-200"><ShoppingBag className="w-4 h-4" /> المبيعات والطلبات</div>
                              <div className="h-10 hover:bg-white/5 rounded-lg flex items-center px-4 gap-3 text-blue-200"><Users className="w-4 h-4" /> العملاء</div>
                            </div>
                         </div>
                         {/* Fake Admin Content */}
                         <div className="flex-1 p-6 md:p-8">
                            <div className="h-8 w-48 bg-gray-100 rounded-md mb-8"></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                              <div className="bg-blue-50 h-24 rounded-xl border border-blue-100 p-4"><div className="h-4 w-16 bg-blue-200 rounded mb-3"></div><div className="h-8 w-24 bg-blue-600 rounded"></div></div>
                              <div className="bg-green-50 h-24 rounded-xl border border-green-100 p-4"><div className="h-4 w-16 bg-green-200 rounded mb-3"></div><div className="h-8 w-24 bg-green-600 rounded"></div></div>
                              <div className="bg-orange-50 h-24 rounded-xl border border-orange-100 p-4"><div className="h-4 w-16 bg-orange-200 rounded mb-3"></div><div className="h-8 w-24 bg-orange-600 rounded"></div></div>
                              <div className="bg-purple-50 h-24 rounded-xl border border-purple-100 p-4"><div className="h-4 w-16 bg-purple-200 rounded mb-3"></div><div className="h-8 w-24 bg-purple-600 rounded"></div></div>
                            </div>
                            <div className="bg-gray-50 h-64 rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
                               <div className="h-10 w-full bg-white rounded border border-gray-100 shadow-sm flex items-center px-4 justify-between"><div className="h-4 w-32 bg-gray-200 rounded"></div><div className="h-6 w-16 bg-green-100 rounded-full"></div></div>
                               <div className="h-10 w-full bg-white rounded border border-gray-100 shadow-sm flex items-center px-4 justify-between"><div className="h-4 w-40 bg-gray-200 rounded"></div><div className="h-6 w-16 bg-orange-100 rounded-full"></div></div>
                               <div className="h-10 w-full bg-white rounded border border-gray-100 shadow-sm flex items-center px-4 justify-between"><div className="h-4 w-24 bg-gray-200 rounded"></div><div className="h-6 w-16 bg-green-100 rounded-full"></div></div>
                            </div>
                         </div>
                       </motion.div>
                    ) : (
                       <motion.div 
                         key="client-preview"
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: -20 }}
                         transition={{ duration: 0.3 }}
                         className="bg-white rounded-2xl border-4 border-gray-800 shadow-xl overflow-hidden flex flex-col min-h-[400px] max-w-sm mx-auto relative"
                       >
                         {/* Mobile notch */}
                         <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                            <div className="w-32 h-6 bg-gray-800 rounded-b-2xl"></div>
                         </div>
                         {/* Fake Client Header */}
                         <div className="bg-green-600 p-6 pt-10 text-white pb-12">
                            <div className="flex items-center justify-between mb-4">
                              <Store className="w-8 h-8 text-white" />
                              <div className="w-10 h-10 bg-white/20 rounded-full"></div>
                            </div>
                            <div className="h-6 w-32 bg-white/30 rounded mb-2"></div>
                            <div className="h-4 w-48 bg-white/20 rounded"></div>
                         </div>
                         {/* Fake Client Content (floating over header) */}
                         <div className="flex-1 bg-gray-50 px-4 pb-4 -mt-6">
                            <div className="bg-white rounded-xl shadow-lg p-4 mb-4 grid grid-cols-2 gap-4">
                               <div className="text-center p-2"><div className="h-8 w-16 bg-green-100 mx-auto rounded mb-2"></div><div className="h-3 w-12 bg-gray-200 mx-auto rounded"></div></div>
                               <div className="text-center p-2"><div className="h-8 w-16 bg-orange-100 mx-auto rounded mb-2"></div><div className="h-3 w-12 bg-gray-200 mx-auto rounded"></div></div>
                            </div>
                            <div className="space-y-4 pt-2">
                               <h4 className="font-bold text-gray-700 text-sm">أحدث المنتجات</h4>
                               <div className="flex gap-4 overflow-hidden">
                                  <div className="min-w-[120px] h-32 bg-white rounded-xl border border-gray-100 p-2"><div className="w-full h-16 bg-gray-100 rounded-lg mb-2"></div><div className="h-3 w-full bg-gray-200 rounded mb-1"></div><div className="h-4 w-12 bg-green-500 rounded"></div></div>
                                  <div className="min-w-[120px] h-32 bg-white rounded-xl border border-gray-100 p-2"><div className="w-full h-16 bg-gray-100 rounded-lg mb-2"></div><div className="h-3 w-full bg-gray-200 rounded mb-1"></div><div className="h-4 w-12 bg-green-500 rounded"></div></div>
                               </div>
                            </div>
                         </div>
                         {/* Fake Client Bottom Nav */}
                         <div className="h-16 bg-white border-t border-gray-100 flex items-center justify-around px-4">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"><Store className="w-4 h-4 text-green-700" /></div>
                            <div className="w-6 h-6 bg-gray-200 rounded-md"></div>
                            <div className="w-6 h-6 bg-gray-200 rounded-md"></div>
                         </div>
                       </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </motion.div>
          </div>
        </section>

        {/* Core Capabilities */}
        <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-black text-[#163C85] mb-6">مميزات القوة والذكاء</h2>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto">تقنيات متطورة تعيد تعريف طريقة إدارتك لمبيعاتك وتسريع سير العمل اليومي</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: PieChart, title: 'مساعد الوصف الذكي (AI)', desc: 'لا تضيع وقتك في كتابة أوصاف المنتجات؛ دع محرك الذكاء الاصطناعي لدينا ينشئ لك أوصافاً إبداعية ومحسنة لمحركات البحث بناءً على بيانات منتجك.', delay: 0.1 },
                { icon: ServerCrash, title: 'العمل بلا حدود (Offline Mode)', desc: 'سجل طلباتك، أضف عملائك، وتابع عملك حتى بدون إنترنت. سيقوم OrderFlow بمزامنة كل شيء تلقائياً بمجرد عودتك للشبكة.', delay: 0.2 },
                { icon: TrendingUp, title: 'لوحة تحكم وتحليلات حية', desc: 'راقب أداء مبيعاتك اليومية، وتتبع متوسطات البيع حسب العملات المختلفة في واجهة تفاعلية واحدة ومنظمة تدعم الفرز المتقدم.', delay: 0.3 }
              ].map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: feature.delay }}
                  className="bg-[#F0F2F5]/50 rounded-[2rem] p-10 border border-gray-100 hover:bg-white hover:shadow-2xl hover:shadow-blue-900/5 transition-all group"
                >
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-8 h-8 text-[#2E5CA6]" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Custom Solutions */}
        <section id="solutions" className="py-24 bg-[#163C85] text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[100px]"></div>
            <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[100px]"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-6">حلول مخصصة تناسب أعمالك</h2>
              <p className="text-blue-200 text-xl max-w-2xl mx-auto">تجربة مخصصة لكل نوع من المستخدمين لضمان سير العمل بأقصى كفاءة</p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* For Admins & Sales */}
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-10"
              >
                <div className="inline-flex px-6 py-3 bg-white/10 rounded-full text-blue-100 font-bold border border-white/20 backdrop-blur-sm text-lg">
                  لأصحاب الشركات والإدارة والمبيعات
                </div>
                <ul className="space-y-8">
                  {[
                    { icon: CreditCard, title: 'إدارة مالية متعددة العملات', desc: 'بع عملاتك المفضلة وتابع إجمالياتك بالعملة الرئيسية للشركة بفضل نظام تحويل العملات المرن المتضمن في كل فاتورة.' },
                    { icon: PieChart, title: 'نظام عروض وبونص متطور', desc: 'صمم خطط بونص مرنة (ثابتة أو شرائح حسب الكمية) لتحفيز المبيعات بشكل تلقائي وفعال.' },
                    { icon: Phone, title: 'توثيق المكالمات الواردة', desc: 'تكامل مباشر لتسجيل مكالمات العملاء وربطها بملفاتهم الشخصية وسجل طلباتهم لضمان جودة الخدمة.' }
                  ].map((item, i) => (
                    <li key={i} className="flex gap-6 items-start group">
                      <div className="mt-1 bg-blue-500/20 p-4 rounded-2xl group-hover:bg-blue-500/40 transition-colors"><item.icon className="w-8 h-8 text-blue-300" /></div>
                      <div>
                        <h4 className="text-2xl font-bold mb-3">{item.title}</h4>
                        <p className="text-blue-100/80 leading-relaxed text-lg">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* For Clients */}
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-[2.5rem] p-10 md:p-14 text-gray-900 shadow-2xl relative"
              >
                <div className="absolute top-0 right-10 -mt-6 bg-green-500 text-white px-8 py-3 rounded-full font-bold shadow-xl transform rotate-3 text-lg">
                  تجربة مريحة للعميل
                </div>
                
                <h3 className="text-3xl font-black text-green-700 mb-10 pt-4">بوابة العملاء (Client Portal)</h3>
                
                <ul className="space-y-10">
                  <li className="flex gap-6 items-start">
                    <div className="mt-1 bg-green-100 p-4 rounded-2xl"><Smartphone className="w-8 h-8 text-green-600" /></div>
                    <div>
                      <h4 className="text-2xl font-bold mb-3 text-gray-900">بوابة الخدمة الذاتية</h4>
                      <p className="text-gray-600 leading-relaxed text-lg">واجهة مخصصة باللون الأخضر المريح تتيح لعملائك تصفح المنتجات، وتقديم الطلبات، ومتابعة سجلهم المالي بشكل مستقل في أي وقت.</p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start">
                    <div className="mt-1 bg-green-100 p-4 rounded-2xl"><Clock className="w-8 h-8 text-green-600" /></div>
                    <div>
                      <h4 className="text-2xl font-bold mb-3 text-gray-900">تنبيهات فورية وإشعارات</h4>
                      <p className="text-gray-600 leading-relaxed text-lg">ابقِ عملائك على اطلاع دائم بحالة طلباتهم ومواعيد سداد الفواتير عبر نظام إشعارات ذكي ومباشر.</p>
                    </div>
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* UI/UX & Security */}
        <section id="security" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-black text-[#163C85] mb-6">الثقة، الأمان، والتجربة</h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-12">
              {[
                { icon: ShieldCheck, title: 'أمان فائق وعزل للبيانات', desc: 'بيانات شركتك محمية بأعلى معايير الأمان مع قواعد بيانات صلبة، مع عزل تام يضمن خصوصية بيانات كل شركة بشكل مستقل تماماً.', delay: 0.1 },
                { icon: Handshake, title: 'تصميم احترافي ومرن', desc: 'واجهات مصممة بعناية باستخدام أحدث المعايير البصرية لتعكس الثقة والموثوقية، بمرونة تامة وتعمل بسلاسة على كافة الأجهزة.', delay: 0.2 },
                { icon: CheckCircle2, title: 'دقة وتكامل جغرافي', desc: 'ربط متكامل لتحديد المواقع لضمان وصول مندوبيك وعملائك إلى العناوين والمناطق الصحيحة بدقة متناهية وسهولة تامة.', delay: 0.3 }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: item.delay }}
                  className="text-center p-8 rounded-3xl bg-gray-50/50 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-20 h-20 mx-auto bg-blue-100 rounded-3xl flex items-center justify-center mb-8 transform -rotate-3 hover:rotate-0 transition-transform">
                    <item.icon className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-[#163C85]">{item.title}</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 bg-[#F0F2F5] relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-blue-600/10 to-transparent pointer-events-none"></div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10"
          >
            <div className="bg-white rounded-[3rem] p-12 md:p-20 text-center shadow-2xl shadow-blue-900/5 border border-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500"></div>
              
              <h2 className="text-4xl md:text-6xl font-black text-[#163C85] mb-8 leading-tight">جاهز لتنظيم تدفق مبيعاتك؟</h2>
              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto">انضم إلى OrderFlow اليوم، واختبر الكفاءة الحقيقية في كل طلب وفي كل عملية بيع.</p>
              
              <Button onClick={onLoginClick} className="h-16 px-12 bg-[#2E5CA6] hover:bg-[#163C85] text-white text-xl font-bold rounded-full shadow-2xl shadow-blue-600/30 transition-transform hover:scale-110">
                تسجيل الدخول الآن
              </Button>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 py-8">
          <p className="text-gray-500 font-medium">© {new Date().getFullYear()} OrderFlow - المنصة المتكاملة لإدارة التجارة</p>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold ml-2">OrderFlow</span>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Network className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

