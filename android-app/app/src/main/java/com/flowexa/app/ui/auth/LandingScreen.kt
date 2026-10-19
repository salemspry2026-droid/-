package com.flowexa.app.ui.auth

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.ui.components.AppLogoText
import com.flowexa.app.ui.components.AppLogoView
import com.flowexa.app.ui.theme.*
import kotlinx.coroutines.launch
import java.util.Calendar

private data class Feature(val icon: ImageVector, val title: String, val desc: String)

private val features = listOf(
    Feature(Icons.Default.PieChart, "مساعد الوصف الذكي (AI)", "لا تضيع وقتك في كتابة أوصاف المنتجات؛ دع محرك الذكاء الاصطناعي لدينا ينشئ لك أوصافاً إبداعية ومحسنة لمحركات البحث بناءً على بيانات منتجك."),
    Feature(Icons.Default.CloudOff, "العمل بلا حدود (Offline Mode)", "سجل طلباتك، أضف عملائك، وتابع عملك حتى بدون إنترنت من تطبيق أندرويد أو الويب. سيقوم Flowexa بمزامنة كل شيء تلقائياً بمجرد عودتك للشبكة."),
    Feature(Icons.Default.TrendingUp, "لوحة تحكم وتحليلات حية", "راقب أداء مبيعاتك اليومية، وتتبع متوسطات البيع حسب العملات المختلفة في واجهة تفاعلية واحدة ومنظمة تدعم الفرز المتقدم.")
)
private val adminPoints = listOf(
    Feature(Icons.Default.CreditCard, "إدارة مالية متعددة العملات", "بع عملاتك المفضلة وتابع إجمالياتك بالعملة الرئيسية للشركة بفضل نظام تحويل العملات المرن المتضمن في كل فاتورة."),
    Feature(Icons.Default.PieChart, "نظام عروض وبونص متطور", "صمم خطط بونص مرنة (ثابتة أو شرائح حسب الكمية) لتحفيز المبيعات بشكل تلقائي وفعال."),
    Feature(Icons.Default.Phone, "توثيق المكالمات الواردة", "تكامل مباشر لتسجيل مكالمات العملاء وربطها بملفاتهم الشخصية وسجل طلباتهم لضمان جودة الخدمة.")
)
private val clientPoints = listOf(
    Feature(Icons.Default.Smartphone, "بوابة الخدمة الذاتية", "واجهة مخصصة باللون الأخضر المريح تتيح لعملائك تصفح المنتجات، وتقديم الطلبات، ومتابعة سجلهم المالي بشكل مستقل في أي وقت."),
    Feature(Icons.Default.Schedule, "تنبيهات فورية وإشعارات", "ابقِ عملائك على اطلاع دائم بحالة طلباتهم ومواعيد سداد الفواتير عبر نظام إشعارات ذكي ومباشر.")
)
private val securityPoints = listOf(
    Feature(Icons.Default.Security, "أمان فائق وعزل للبيانات", "بيانات شركتك محمية بأعلى معايير الأمان مع قواعد بيانات صلبة، مع عزل تام يضمن خصوصية بيانات كل شركة بشكل مستقل تماماً."),
    Feature(Icons.Default.Handshake, "تصميم احترافي ومرن", "واجهات مصممة بعناية باستخدام أحدث المعايير البصرية لتعكس الثقة والموثوقية، بمرونة تامة وتعمل بسلاسة على كافة الأجهزة."),
    Feature(Icons.Default.CheckCircle, "دقة وتكامل جغرافي", "ربط متكامل لتحديد المواقع لضمان وصول مندوبيك وعملائك إلى العناوين والمناطق الصحيحة بدقة متناهية وسهولة تامة.")
)

/** Web parity: components/LandingPage.tsx (header, hero, preview switcher, features, solutions, security, CTA, footer). */
@Composable
fun LandingScreen(
    onLoginClick: () -> Unit,
    onRegisterClick: () -> Unit = onLoginClick
) {
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    var menuOpen by remember { mutableStateOf(false) }
    // item indexes: 0 header, 1 hero, 2 preview, 3 features, 4 solutions, 5 security, 6 cta, 7 footer
    fun scrollTo(i: Int) { menuOpen = false; scope.launch { listState.animateScrollToItem(i) } }

    Column(Modifier.fillMaxSize().background(Color.White)) {
        // Fixed header
        Surface(color = Color.White.copy(alpha = 0.95f), shadowElevation = 2.dp) {
            Column {
                Row(
                    Modifier.fillMaxWidth().statusBarsPadding().height(64.dp).padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(Modifier.clickable { scrollTo(0) }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        AppLogoView(size = 36, showText = false)
                        AppLogoText(fontSize = 22.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Button(onClick = onLoginClick, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue)) {
                            Text("تسجيل الدخول", fontWeight = FontWeight.Bold)
                        }
                        IconButton(onClick = { menuOpen = !menuOpen }) {
                            Icon(if (menuOpen) Icons.Default.Close else Icons.Default.Menu, contentDescription = "القائمة", tint = TextSecondary)
                        }
                    }
                }
                if (menuOpen) {
                    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                        listOf("المميزات" to 3, "الحلول" to 4, "الأمان والتجربة" to 5).forEach { (name, idx) ->
                            Text(name, Modifier.fillMaxWidth().clickable { scrollTo(idx) }.padding(vertical = 12.dp), fontWeight = FontWeight.Bold, color = TextSecondary)
                        }
                    }
                }
            }
        }

        LazyColumn(state = listState, modifier = Modifier.fillMaxSize()) {
            item { Spacer(Modifier.height(0.dp)) }

            // Hero
            item {
                Column(
                    Modifier.fillMaxWidth()
                        .background(Brush.verticalGradient(listOf(Color(0xFFF0F2F5), Color(0xFFF8FAFC), Color.White)))
                        .padding(horizontal = 20.dp, vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        Modifier.clip(RoundedCornerShape(50)).background(FlowexaBlueLight).padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.TrendingUp, null, tint = FlowexaBlue, modifier = Modifier.size(16.dp))
                        Text("المنصة الأسرع نمواً لإدارة المبيعات والتجارة", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = FlowexaBlue)
                    }
                    Text("مستقبلك في إدارة", fontSize = 32.sp, fontWeight = FontWeight.Black, color = TextPrimary, textAlign = TextAlign.Center)
                    Text("المبيعات الذكية", fontSize = 32.sp, fontWeight = FontWeight.Black, color = FlowexaBlue, textAlign = TextAlign.Center)
                    Text(
                        "المنصة المتكاملة لإدارة التجارة متعددة المستأجرين، المدعومة بالذكاء الاصطناعي لتبسيط تدفق الطلبات وتعزيز علاقات العملاء في واجهة واحدة.",
                        fontSize = 15.sp, color = TextSecondary, textAlign = TextAlign.Center, lineHeight = 24.sp
                    )
                    Button(
                        onClick = onLoginClick, modifier = Modifier.fillMaxWidth().height(54.dp),
                        shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue)
                    ) {
                        Text("ابدأ التجربة مجاناً", fontSize = 17.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.width(8.dp)); Icon(Icons.Default.ArrowBack, null)
                    }
                    OutlinedButton(
                        onClick = { scrollTo(2) }, modifier = Modifier.fillMaxWidth().height(54.dp), shape = RoundedCornerShape(16.dp)
                    ) { Text("استكشف الواجهات", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary) }
                }
            }

            // Preview switcher
            item { PreviewSection() }

            // Features
            item {
                SectionTitle("مميزات القوة والذكاء", "تقنيات متطورة تعيد تعريف طريقة إدارتك لمبيعاتك وتسريع سير العمل اليومي", Color.White)
                Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    features.forEach { FeatureCard(it) }
                }
                Spacer(Modifier.height(32.dp))
            }

            // Solutions
            item {
                Column(Modifier.fillMaxWidth().background(FlowexaBlue).padding(horizontal = 20.dp, vertical = 36.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("حلول مخصصة تناسب أعمالك", fontSize = 24.sp, fontWeight = FontWeight.Black, color = Color.White, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                    Text("تجربة مخصصة لكل نوع من المستخدمين لضمان سير العمل بأقصى كفاءة", fontSize = 14.sp, color = Color.White.copy(alpha = 0.8f), textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                    SolutionBlock("لأصحاب الشركات والإدارة والمبيعات", null, adminPoints, Color.White.copy(alpha = 0.10f), Color.White)
                    SolutionBlock("تجربة مريحة للعميل", "بوابة العملاء (Client Portal)", clientPoints, FlowexaGreen.copy(alpha = 0.25f), Color.White)
                }
            }

            // Security
            item {
                SectionTitle("الثقة، الأمان، والتجربة", null, Color.White)
                Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    securityPoints.forEach { FeatureCard(it) }
                }
                Spacer(Modifier.height(32.dp))
            }

            // Final CTA
            item {
                Column(
                    Modifier.fillMaxWidth().padding(20.dp).clip(RoundedCornerShape(28.dp)).background(FlowexaBlue).padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("جاهز لتنظيم تدفق مبيعاتك؟", fontSize = 24.sp, fontWeight = FontWeight.Black, color = Color.White, textAlign = TextAlign.Center)
                    Text("انضم إلى Flowexa اليوم من المتصفح أو حمّل تطبيق أندرويد للعمل أونلاين وأوفلاين.", fontSize = 14.sp, color = Color.White.copy(alpha = 0.85f), textAlign = TextAlign.Center)
                    Button(
                        onClick = onLoginClick, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = FlowexaBlue)
                    ) { Text("تسجيل الدخول الآن", fontWeight = FontWeight.Bold, fontSize = 16.sp) }
                }
            }

            // Footer
            item {
                val year = remember { Calendar.getInstance().get(Calendar.YEAR) }
                Column(Modifier.fillMaxWidth().background(Color.White).padding(vertical = 28.dp, horizontal = 20.dp).navigationBarsPadding(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        AppLogoText(fontSize = 20.sp); AppLogoView(size = 28, showText = false)
                    }
                    Text("© $year Flowexa - نُدير أعمالك .. نربط عملاءك .. ننمي مبيعاتك", fontSize = 12.sp, color = TextMuted, textAlign = TextAlign.Center)
                }
            }
        }
    }
}

@Composable
private fun SectionTitle(title: String, sub: String?, bg: Color) {
    Column(Modifier.fillMaxWidth().background(bg).padding(horizontal = 20.dp, vertical = 32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, fontSize = 24.sp, fontWeight = FontWeight.Black, color = TextPrimary, textAlign = TextAlign.Center)
        if (sub != null) Text(sub, fontSize = 14.sp, color = TextSecondary, textAlign = TextAlign.Center)
    }
}

@Composable
private fun FeatureCard(f: Feature) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color(0xFFF8FAFC)).border(1.dp, FlowexaBorder, RoundedCornerShape(20.dp)).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Box(Modifier.size(48.dp).clip(RoundedCornerShape(14.dp)).background(FlowexaBlueLight), contentAlignment = Alignment.Center) {
            Icon(f.icon, null, tint = FlowexaBlue)
        }
        Text(f.title, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Text(f.desc, fontSize = 13.sp, color = TextSecondary, lineHeight = 21.sp)
    }
}

@Composable
private fun SolutionBlock(badge: String, heading: String?, points: List<Feature>, bg: Color, fg: Color) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(bg).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(badge, Modifier.clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = 0.15f)).padding(horizontal = 12.dp, vertical = 6.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = fg)
        if (heading != null) Text(heading, fontSize = 20.sp, fontWeight = FontWeight.Black, color = fg)
        points.forEach { p ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
                Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                    Icon(p.icon, null, tint = fg, modifier = Modifier.size(20.dp))
                }
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(p.title, fontWeight = FontWeight.Bold, color = fg, fontSize = 15.sp)
                    Text(p.desc, color = fg.copy(alpha = 0.8f), fontSize = 12.sp, lineHeight = 19.sp)
                }
            }
        }
    }
}

@Composable
private fun PreviewSection() {
    var admin by remember { mutableStateOf(true) }
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(50)).background(Color(0xFFF1F5F9)).padding(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            listOf(true to "لوحة تحكم الإدارة والمبيعات", false to "واجهة العميل للطلبات").forEach { (isAdmin, label) ->
                val sel = admin == isAdmin
                Box(
                    Modifier.weight(1f).clip(RoundedCornerShape(50)).background(if (sel) FlowexaBlue else Color.Transparent)
                        .clickable { admin = isAdmin }.padding(vertical = 10.dp, horizontal = 6.dp),
                    contentAlignment = Alignment.Center
                ) { Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (sel) Color.White else TextSecondary, textAlign = TextAlign.Center) }
            }
        }
        Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).border(1.dp, FlowexaBorder, RoundedCornerShape(24.dp)).background(FlowexaBg).padding(14.dp)) {
            AnimatedContent(targetState = admin, label = "preview") { isAdmin ->
                if (isAdmin) AdminMock() else ClientMock()
            }
        }
    }
}

@Composable
private fun AdminMock() {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Column {
            Text("مرحباً بك مجدداً 👋", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text("نظرة عامة على أداء مبيعاتك اليوم", fontSize = 12.sp, color = TextSecondary)
        }
        listOf(listOf("طلبات اليوم" to "142", "مبيعات اليوم" to "$4,250"), listOf("إجمالي العملاء" to "853", "الأصناف النشطة" to "45")).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { (t, v) ->
                    Column(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(Color.White).padding(12.dp)) {
                        Text(t, fontSize = 11.sp, color = TextSecondary); Text(v, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                }
            }
        }
        Column(Modifier.fillMaxWidth().height(90.dp).clip(RoundedCornerShape(14.dp)).background(Color.White), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(Icons.Default.PieChart, null, tint = FlowexaBlue.copy(alpha = 0.4f))
            Text("رسم بياني للمبيعات (محتوى تجريبي)", fontSize = 11.sp, color = TextMuted)
        }
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Color.White).padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
            listOf("الرئيسية" to Icons.Default.Dashboard, "الطلبات" to Icons.Default.ReceiptLong, "الأصناف" to Icons.Default.Inventory2, "العملاء" to Icons.Default.People, "الموظفين" to Icons.Default.Security).forEachIndexed { i, (n, ic) ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(ic, null, tint = if (i == 0) FlowexaBlue else TextMuted, modifier = Modifier.size(18.dp)); Text(n, fontSize = 9.sp, color = if (i == 0) FlowexaBlue else TextMuted)
                }
            }
        }
    }
}

@Composable
private fun ClientMock() {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(FlowexaGreen).padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Store, null, tint = Color.White)
            Text("متجر أوردر فلو", fontWeight = FontWeight.Bold, color = Color.White)
            Text("بوابتك للطلب المباشر", fontSize = 11.sp, color = Color.White.copy(alpha = 0.85f))
        }
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Color.White).padding(12.dp)) {
            Text("الرصيد المستخدم", fontSize = 11.sp, color = TextSecondary)
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("1,250", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = FlowexaGreenDark); Text("ر.س", fontSize = 12.sp, color = TextSecondary)
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("الأصناف المميزة", fontWeight = FontWeight.Bold, fontSize = 13.sp); Text("عرض الكل", fontSize = 11.sp, color = FlowexaGreen)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            repeat(2) { Box(Modifier.weight(1f).height(60.dp).clip(RoundedCornerShape(12.dp)).background(Color.White)) }
        }
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Color.White).padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
            listOf("الرئيسية" to Icons.Default.Dashboard, "المنتجات" to Icons.Default.ShoppingBag, "الطلبات" to Icons.Default.ReceiptLong, "حسابي" to Icons.Default.Person).forEachIndexed { i, (n, ic) ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(ic, null, tint = if (i == 0) FlowexaGreen else TextMuted, modifier = Modifier.size(18.dp)); Text(n, fontSize = 9.sp, color = if (i == 0) FlowexaGreen else TextMuted)
                }
            }
        }
    }
}
