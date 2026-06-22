// Homepage FAQ content (SEO-rich, rendered as visible accordion + FAQPage JSON-LD).
// English is the canonical set. Locales that are fully translated are served in their
// own language; any locale without a translation falls back to English so the page
// always renders complete, valid FAQ markup. Additional locales are translated in
// dedicated content batches.
import { DEFAULT_LOCALE, type Locale } from "./locales"

export type Faq = { q: string; a: string }

const en: Faq[] = [
  { q: "How does Auto to Rental work?", a: "Browse 1,200+ rental cars across UAE and Syria. When you find one you like, contact the rental company directly via WhatsApp, Phone, or Free International Call. Agree the price and pickup with them. Auto to Rental charges zero commission." },
  { q: "Do I pay any fee to Auto to Rental?", a: "No. Customers pay zero. We never charge booking fees, commission, or markup. The price you see on a listing is what you pay the rental company directly." },
  { q: "Are the rental companies verified?", a: "Yes. Every rental company is vetted — trade license, identity, and operational checks — before they can publish listings. Verified companies show a blue checkmark." },
  { q: "How much does it cost to rent a car in Dubai?", a: "Economy cars from AED 79-150/day. SUVs from AED 250/day. Luxury and sports cars from AED 500-5,000/day. Monthly rentals offer up to 40% off daily rates." },
  { q: "Can I rent a car as a tourist?", a: "Yes. Tourists need a passport, home country driving licence (held 1+ year), International Driving Permit (for most nationalities), and a credit card for the security deposit." },
  { q: "What is Free International Call?", a: "A free browser-based video call to the rental company. No international phone charges. Useful when you are planning your trip from abroad and want to talk to the rental company before booking." },
  { q: "Do you serve cities outside Dubai?", a: "Yes — across all UAE emirates (Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain, Al Ain) and all major Syrian cities (Damascus, Aleppo, Latakia, Homs, Hama, Tartus, Idlib, Daraa)." },
  { q: "How are reviews verified?", a: "Reviews are pulled from each rental company official Google Business Profile and from verified Auto to Rental customers. We do not allow fake reviews." },
  { q: "What is the minimum age to rent a car?", a: "21 years for most economy and SUV models. 25 years for luxury, sports, and premium SUV categories. Some companies allow under-25 with a young-driver surcharge — check the listing or ask the company." },
  { q: "Is insurance included in the rental price?", a: "Basic third-party insurance is included by law in every rental. Most companies also include CDW (Collision Damage Waiver) with a deductible. Full Insurance with zero deductible is usually a paid add-on — confirm with the rental company before pickup." },
  { q: "Do I need a security deposit?", a: "Yes. Most rental companies block AED 1,000-5,000 on your credit card as a security deposit, refunded after returning the car undamaged. Luxury cars require larger deposits. Cash deposits are accepted by some companies but credit card is preferred." },
  { q: "Can I deliver the car to my hotel or the airport?", a: "Most rental companies offer free delivery within the same emirate. Airport pickup/drop-off is usually free or a small fee (AED 50-150). Confirm delivery cost and timing when you contact the company on WhatsApp." },
  { q: "What if I need to cancel?", a: "Since you book directly with the rental company, cancellation terms are set by them. Most companies allow free cancellation up to 24-48 hours before pickup. Always confirm cancellation policy in writing on WhatsApp before paying." },
  { q: "Can I rent monthly instead of daily?", a: "Yes — monthly rentals are very popular and save up to 40% vs daily rates. Filter by Monthly on the search page, or ask any company directly for their monthly offers. Long-term (3+ months) deals are also available with extra discount." },
  { q: "Are mileage limits enforced?", a: "Most daily rentals allow 200-300 km/day free. Monthly rentals usually include 3,500-5,000 km/month free. Extra km is charged at AED 0.30-1.00 each, depending on the vehicle category. Confirm with the company before signing." },
  { q: "Can I take the car to Oman or another GCC country?", a: "Usually yes, but it requires a special cross-border permit from the rental company (around AED 150-300) and additional insurance. Tell the company in advance which countries you plan to drive in." },
  { q: "What documents do I need for delivery?", a: "A valid driving licence (UAE for residents, home licence + IDP for tourists), Emirates ID or passport, and the credit card used for the deposit. The agent inspects and photographs the car with you at handover." },
  { q: "Is fuel included or do I need to refill?", a: "Standard policy is Full-to-Full: pickup with full tank, return with full tank. Some companies offer Full-to-Empty (pay for a full tank upfront, return empty). Always check the receipt at pickup." },
  { q: "Can I add a second driver?", a: "Yes. Most companies allow one additional driver free of charge if their licence is shown at pickup. Extra drivers cost AED 25-75 each. Always have all drivers listed on the rental agreement — driving uninsured voids the policy." },
  { q: "How do I report a problem with a rental?", a: "First contact the rental company directly. If unresolved, click the Report button on any listing and choose your reason — our team reviews every report within 24 hours and may suspend non-compliant companies." },
]

const ar: Faq[] = [
  { q: "كيف يعمل أوتو تو رينتال؟", a: "تصفّح أكثر من 1,200 سيارة للإيجار في الإمارات وسوريا. عندما تجد سيارة تناسبك، تواصل مع شركة التأجير مباشرة عبر واتساب أو الهاتف أو المكالمة الدولية المجانية. اتفق معهم على السعر والاستلام. أوتو تو رينتال لا تأخذ أي عمولة." },
  { q: "هل أدفع أي رسوم لأوتو تو رينتال؟", a: "لا. لا يدفع العملاء أي شيء. لا نفرض أبدًا رسوم حجز أو عمولة أو هامش ربح. السعر الذي تراه في الإعلان هو ما تدفعه لشركة التأجير مباشرة." },
  { q: "هل شركات التأجير موثّقة؟", a: "نعم. كل شركة تأجير تخضع للتدقيق — الرخصة التجارية والهوية والفحوصات التشغيلية — قبل أن تتمكن من نشر إعلاناتها. الشركات الموثّقة تظهر بعلامة زرقاء." },
  { q: "كم تكلفة استئجار سيارة في دبي؟", a: "السيارات الاقتصادية من 79 إلى 150 درهمًا يوميًا. سيارات الدفع الرباعي من 250 درهمًا يوميًا. السيارات الفاخرة والرياضية من 500 إلى 5,000 درهم يوميًا. الإيجار الشهري يوفّر خصمًا يصل إلى 40% عن الأسعار اليومية." },
  { q: "هل يمكنني استئجار سيارة كسائح؟", a: "نعم. يحتاج السائح إلى جواز سفر، ورخصة قيادة من بلده (سارية منذ سنة أو أكثر)، ورخصة قيادة دولية (لمعظم الجنسيات)، وبطاقة ائتمان للتأمين." },
  { q: "ما هي المكالمة الدولية المجانية؟", a: "مكالمة فيديو مجانية عبر المتصفح مع شركة التأجير. بدون رسوم اتصال دولية. مفيدة عندما تخطّط لرحلتك من الخارج وتريد التحدث مع شركة التأجير قبل الحجز." },
  { q: "هل تخدمون مدنًا خارج دبي؟", a: "نعم — في جميع إمارات الدولة (أبوظبي، الشارقة، عجمان، رأس الخيمة، الفجيرة، أم القيوين، العين) وجميع المدن السورية الرئيسية (دمشق، حلب، اللاذقية، حمص، حماة، طرطوس، إدلب، درعا)." },
  { q: "كيف يتم التحقق من التقييمات؟", a: "تُجمع التقييمات من ملف Google التجاري الرسمي لكل شركة تأجير ومن عملاء أوتو تو رينتال الموثّقين. لا نسمح بالتقييمات المزيّفة." },
  { q: "ما هو الحد الأدنى لسن استئجار السيارة؟", a: "21 عامًا لمعظم السيارات الاقتصادية وسيارات الدفع الرباعي. 25 عامًا للفئات الفاخرة والرياضية والدفع الرباعي المميّزة. تسمح بعض الشركات لمن هم دون 25 عامًا مقابل رسوم سائق شاب — راجع الإعلان أو اسأل الشركة." },
  { q: "هل التأمين مشمول في سعر الإيجار؟", a: "التأمين الأساسي ضد الغير مشمول قانونًا في كل إيجار. كما تشمل معظم الشركات تأمين الإعفاء من أضرار الاصطدام (CDW) مع مبلغ تحمّل. التأمين الشامل بدون تحمّل عادةً إضافة مدفوعة — تأكّد من شركة التأجير قبل الاستلام." },
  { q: "هل أحتاج إلى تأمين (وديعة ضمان)؟", a: "نعم. تحجز معظم شركات التأجير من 1,000 إلى 5,000 درهم على بطاقتك الائتمانية كوديعة ضمان، تُعاد بعد إرجاع السيارة دون أضرار. السيارات الفاخرة تتطلب ودائع أكبر. تقبل بعض الشركات الودائع النقدية لكن البطاقة الائتمانية مفضّلة." },
  { q: "هل يمكن توصيل السيارة إلى فندقي أو المطار؟", a: "تقدّم معظم شركات التأجير توصيلًا مجانيًا داخل الإمارة نفسها. الاستلام والتسليم في المطار عادةً مجاني أو برسوم بسيطة (50-150 درهمًا). أكّد تكلفة التوصيل وتوقيته عند التواصل مع الشركة على واتساب." },
  { q: "ماذا لو احتجت إلى الإلغاء؟", a: "بما أنك تحجز مباشرة مع شركة التأجير، فإنها تحدّد شروط الإلغاء. تسمح معظم الشركات بالإلغاء المجاني حتى 24-48 ساعة قبل الاستلام. أكّد دائمًا سياسة الإلغاء كتابيًا عبر واتساب قبل الدفع." },
  { q: "هل يمكنني الاستئجار شهريًا بدلًا من يوميًا؟", a: "نعم — الإيجار الشهري شائع جدًا ويوفّر حتى 40% مقارنة بالأسعار اليومية. صفِّ النتائج حسب «شهري» في صفحة البحث، أو اسأل أي شركة مباشرة عن عروضها الشهرية. تتوفر أيضًا عروض طويلة الأمد (3 أشهر فأكثر) بخصم إضافي." },
  { q: "هل هناك حد للمسافة المقطوعة؟", a: "تسمح معظم الإيجارات اليومية بـ 200-300 كم يوميًا مجانًا. عادةً تشمل الإيجارات الشهرية 3,500-5,000 كم شهريًا مجانًا. يُحتسب الكيلومتر الإضافي بـ 0.30-1.00 درهم حسب فئة السيارة. أكّد ذلك مع الشركة قبل التوقيع." },
  { q: "هل يمكنني أخذ السيارة إلى عُمان أو دولة خليجية أخرى؟", a: "عادةً نعم، لكن ذلك يتطلب تصريح عبور حدودي خاصًا من شركة التأجير (نحو 150-300 درهم) وتأمينًا إضافيًا. أخبر الشركة مسبقًا بالدول التي تنوي القيادة فيها." },
  { q: "ما المستندات التي أحتاجها عند الاستلام؟", a: "رخصة قيادة سارية (إماراتية للمقيمين، أو رخصة بلدك + رخصة دولية للسياح)، والهوية الإماراتية أو جواز السفر، وبطاقة الائتمان المستخدمة للوديعة. يفحص الموظف السيارة ويصوّرها معك عند التسليم." },
  { q: "هل الوقود مشمول أم عليّ التعبئة؟", a: "السياسة المعتادة هي «ممتلئ إلى ممتلئ»: استلام بخزان ممتلئ وإرجاع بخزان ممتلئ. تقدّم بعض الشركات «ممتلئ إلى فارغ» (ادفع ثمن خزان كامل مقدمًا وأرجِع السيارة فارغة). تحقّق دائمًا من الإيصال عند الاستلام." },
  { q: "هل يمكنني إضافة سائق ثانٍ؟", a: "نعم. تسمح معظم الشركات بسائق إضافي واحد مجانًا إذا أُبرزت رخصته عند الاستلام. يكلّف السائق الإضافي 25-75 درهمًا. أدرج دائمًا جميع السائقين في عقد الإيجار — القيادة دون تأمين تُبطل الوثيقة." },
  { q: "كيف أبلّغ عن مشكلة في الإيجار؟", a: "تواصل أولًا مع شركة التأجير مباشرة. إذا لم تُحل المشكلة، اضغط زر «إبلاغ» في أي إعلان واختر سببك — يراجع فريقنا كل بلاغ خلال 24 ساعة وقد يوقف الشركات غير الملتزمة." },
]

const es: Faq[] = [
  { q: "¿Cómo funciona Auto to Rental?", a: "Explora más de 1.200 coches de alquiler en EAU y Siria. Cuando encuentres uno que te guste, contacta directamente con la empresa de alquiler por WhatsApp, teléfono o llamada internacional gratuita. Acuerda con ellos el precio y la recogida. Auto to Rental no cobra ninguna comisión." },
  { q: "¿Pago alguna tarifa a Auto to Rental?", a: "No. Los clientes no pagan nada. Nunca cobramos tarifas de reserva, comisiones ni recargos. El precio que ves en un anuncio es lo que pagas directamente a la empresa de alquiler." },
  { q: "¿Están verificadas las empresas de alquiler?", a: "Sí. Cada empresa se verifica —licencia comercial, identidad y controles operativos— antes de poder publicar anuncios. Las empresas verificadas muestran una marca azul." },
  { q: "¿Cuánto cuesta alquilar un coche en Dubái?", a: "Coches económicos desde 79-150 AED/día. SUV desde 250 AED/día. Coches de lujo y deportivos desde 500-5.000 AED/día. Los alquileres mensuales ofrecen hasta un 40% de descuento sobre las tarifas diarias." },
  { q: "¿Puedo alquilar un coche como turista?", a: "Sí. Los turistas necesitan pasaporte, permiso de conducir de su país (con más de 1 año de antigüedad), permiso de conducir internacional (para la mayoría de nacionalidades) y una tarjeta de crédito para el depósito de seguridad." },
  { q: "¿Qué es la llamada internacional gratuita?", a: "Una videollamada gratuita desde el navegador con la empresa de alquiler. Sin cargos telefónicos internacionales. Útil cuando planificas tu viaje desde el extranjero y quieres hablar con la empresa antes de reservar." },
  { q: "¿Operan en ciudades fuera de Dubái?", a: "Sí, en todos los emiratos de EAU (Abu Dabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain, Al Ain) y en todas las principales ciudades sirias (Damasco, Alepo, Latakia, Homs, Hama, Tartús, Idlib, Daraa)." },
  { q: "¿Cómo se verifican las reseñas?", a: "Las reseñas se obtienen del perfil oficial de Google Business de cada empresa de alquiler y de clientes verificados de Auto to Rental. No permitimos reseñas falsas." },
  { q: "¿Cuál es la edad mínima para alquilar un coche?", a: "21 años para la mayoría de modelos económicos y SUV. 25 años para las categorías de lujo, deportivos y SUV premium. Algunas empresas permiten menores de 25 con un recargo para conductores jóvenes; consulta el anuncio o pregunta a la empresa." },
  { q: "¿El seguro está incluido en el precio del alquiler?", a: "El seguro básico a terceros está incluido por ley en todo alquiler. La mayoría de empresas también incluyen CDW (exención de daños por colisión) con una franquicia. El seguro a todo riesgo sin franquicia suele ser un extra de pago; confírmalo con la empresa antes de la recogida." },
  { q: "¿Necesito un depósito de seguridad?", a: "Sí. La mayoría de empresas bloquean entre 1.000 y 5.000 AED en tu tarjeta de crédito como depósito, que se devuelve tras entregar el coche sin daños. Los coches de lujo requieren depósitos mayores. Algunas empresas aceptan depósitos en efectivo, pero se prefiere la tarjeta de crédito." },
  { q: "¿Pueden entregar el coche en mi hotel o en el aeropuerto?", a: "La mayoría de empresas ofrecen entrega gratuita dentro del mismo emirato. La recogida/entrega en el aeropuerto suele ser gratuita o con una pequeña tarifa (50-150 AED). Confirma el coste y el horario de entrega al contactar por WhatsApp." },
  { q: "¿Qué pasa si necesito cancelar?", a: "Como reservas directamente con la empresa de alquiler, las condiciones de cancelación las fijan ellos. La mayoría permite cancelación gratuita hasta 24-48 horas antes de la recogida. Confirma siempre la política de cancelación por escrito en WhatsApp antes de pagar." },
  { q: "¿Puedo alquilar por meses en lugar de por días?", a: "Sí, los alquileres mensuales son muy populares y ahorran hasta un 40% frente a las tarifas diarias. Filtra por Mensual en la página de búsqueda o pregunta directamente a cualquier empresa por sus ofertas mensuales. También hay ofertas a largo plazo (3+ meses) con descuento adicional." },
  { q: "¿Se aplican límites de kilometraje?", a: "La mayoría de alquileres diarios permiten 200-300 km/día gratis. Los mensuales suelen incluir 3.500-5.000 km/mes gratis. El kilómetro extra se cobra a 0,30-1,00 AED según la categoría del vehículo. Confírmalo con la empresa antes de firmar." },
  { q: "¿Puedo llevar el coche a Omán u otro país del Golfo?", a: "Normalmente sí, pero requiere un permiso especial de cruce de frontera de la empresa de alquiler (unos 150-300 AED) y un seguro adicional. Indica a la empresa con antelación en qué países piensas conducir." },
  { q: "¿Qué documentos necesito para la entrega?", a: "Un permiso de conducir válido (de EAU para residentes; del país de origen + PIC para turistas), Emirates ID o pasaporte, y la tarjeta de crédito usada para el depósito. El agente inspecciona y fotografía el coche contigo en la entrega." },
  { q: "¿El combustible está incluido o debo repostar?", a: "La política estándar es lleno-a-lleno: recoges con el depósito lleno y lo devuelves lleno. Algunas empresas ofrecen lleno-a-vacío (pagas un depósito lleno por adelantado y lo devuelves vacío). Revisa siempre el recibo en la recogida." },
  { q: "¿Puedo añadir un segundo conductor?", a: "Sí. La mayoría de empresas permiten un conductor adicional gratis si presenta su permiso en la recogida. Los conductores extra cuestan 25-75 AED cada uno. Incluye siempre a todos los conductores en el contrato; conducir sin seguro anula la póliza." },
  { q: "¿Cómo informo de un problema con un alquiler?", a: "Primero contacta directamente con la empresa de alquiler. Si no se resuelve, pulsa el botón Reportar en cualquier anuncio y elige tu motivo; nuestro equipo revisa cada reporte en 24 horas y puede suspender a empresas que incumplan." },
]

const zh: Faq[] = [
  { q: "Auto to Rental 如何运作？", a: "浏览阿联酋和叙利亚的 1,200 多辆租赁汽车。找到喜欢的车后，通过 WhatsApp、电话或免费国际通话直接联系租车公司。与他们商定价格和取车方式。Auto to Rental 不收取任何佣金。" },
  { q: "我需要向 Auto to Rental 支付任何费用吗？", a: "不需要。客户无需支付任何费用。我们从不收取预订费、佣金或加价。您在车源上看到的价格就是您直接支付给租车公司的价格。" },
  { q: "租车公司经过认证吗？", a: "是的。每家租车公司在发布车源前都会经过审核——营业执照、身份和运营核查。已认证的公司会显示蓝色对勾。" },
  { q: "在迪拜租车需要多少钱？", a: "经济型车每天 79-150 迪拉姆。SUV 每天 250 迪拉姆起。豪华和跑车每天 500-5,000 迪拉姆。月租比日租最多可省 40%。" },
  { q: "我可以作为游客租车吗？", a: "可以。游客需要护照、本国驾照（持有 1 年以上）、国际驾驶许可（适用于大多数国籍）以及用于押金的信用卡。" },
  { q: "什么是免费国际通话？", a: "与租车公司进行的基于浏览器的免费视频通话。没有国际电话费。当您在国外规划行程并希望在预订前与租车公司沟通时非常有用。" },
  { q: "你们服务迪拜以外的城市吗？", a: "是的——覆盖阿联酋所有酋长国（阿布扎比、沙迦、阿治曼、哈伊马角、富吉拉、乌姆盖万、艾因）以及叙利亚所有主要城市（大马士革、阿勒颇、拉塔基亚、霍姆斯、哈马、塔尔图斯、伊德利卜、德拉）。" },
  { q: "评价如何验证？", a: "评价来自每家租车公司的官方 Google 商家资料以及经过验证的 Auto to Rental 客户。我们不允许虚假评价。" },
  { q: "租车的最低年龄是多少？", a: "大多数经济型和 SUV 车型为 21 岁。豪华、跑车和高端 SUV 类别为 25 岁。一些公司允许 25 岁以下租车并加收年轻驾驶员附加费——请查看车源或咨询公司。" },
  { q: "租金中包含保险吗？", a: "根据法律，每次租车都包含基本的第三方保险。大多数公司还包含带免赔额的碰撞损失免责险（CDW）。零免赔额的全险通常为付费附加项——取车前请向租车公司确认。" },
  { q: "我需要押金吗？", a: "是的。大多数租车公司会在您的信用卡上冻结 1,000-5,000 迪拉姆作为押金，在无损还车后退还。豪华车需要更高押金。一些公司接受现金押金，但更倾向信用卡。" },
  { q: "可以把车送到我的酒店或机场吗？", a: "大多数租车公司在同一酋长国内提供免费送车。机场接送通常免费或收取少量费用（50-150 迪拉姆）。联系公司时请在 WhatsApp 上确认送车费用和时间。" },
  { q: "如果我需要取消怎么办？", a: "由于您直接与租车公司预订，取消条款由他们制定。大多数公司允许在取车前 24-48 小时免费取消。付款前请务必在 WhatsApp 上书面确认取消政策。" },
  { q: "我可以按月租而不是按日租吗？", a: "可以——月租非常受欢迎，比日租最多可省 40%。在搜索页面按「月租」筛选，或直接询问任何公司的月租优惠。也提供长期（3 个月以上）额外折扣优惠。" },
  { q: "有里程限制吗？", a: "大多数日租允许每天 200-300 公里免费。月租通常包含每月 3,500-5,000 公里免费。超出里程按每公里 0.30-1.00 迪拉姆收费，视车型而定。签约前请向公司确认。" },
  { q: "我可以把车开到阿曼或其他海湾国家吗？", a: "通常可以，但需要租车公司提供特殊的跨境许可（约 150-300 迪拉姆）和额外保险。请提前告知公司您计划驾驶前往的国家。" },
  { q: "取车需要哪些证件？", a: "有效驾照（居民为阿联酋驾照，游客为本国驾照 + 国际驾驶许可）、阿联酋身份证或护照，以及用于押金的信用卡。交车时工作人员会与您一起检查并拍摄车辆。" },
  { q: "燃油包含在内还是我需要加油？", a: "标准政策为满油取车、满油还车。一些公司提供满油取、空油还（预付满油费用，还车时油箱可为空）。取车时请务必核对收据。" },
  { q: "我可以增加第二位驾驶员吗？", a: "可以。如果在取车时出示驾照，大多数公司允许免费增加一位驾驶员。额外驾驶员每位 25-75 迪拉姆。请务必将所有驾驶员列入租赁协议——无保险驾驶将使保单失效。" },
  { q: "如何报告租车问题？", a: "首先直接联系租车公司。如未解决，点击任何车源上的「举报」按钮并选择原因——我们的团队会在 24 小时内审核每份举报，并可能暂停不合规的公司。" },
]

const th: Faq[] = [
  { q: "Auto to Rental ทำงานอย่างไร?", a: "เลือกชมรถเช่ากว่า 1,200 คันทั่ว UAE และซีเรีย เมื่อพบคันที่ถูกใจ ติดต่อบริษัทเช่ารถโดยตรงผ่าน WhatsApp โทรศัพท์ หรือโทรต่างประเทศฟรี ตกลงราคาและจุดรับรถกับบริษัท Auto to Rental ไม่คิดค่าคอมมิชชั่นใด ๆ" },
  { q: "ฉันต้องจ่ายค่าธรรมเนียมให้ Auto to Rental ไหม?", a: "ไม่ ลูกค้าไม่ต้องจ่ายอะไรเลย เราไม่เคยคิดค่าจอง ค่าคอมมิชชั่น หรือบวกเพิ่ม ราคาที่คุณเห็นในประกาศคือราคาที่คุณจ่ายให้บริษัทเช่ารถโดยตรง" },
  { q: "บริษัทเช่ารถได้รับการยืนยันหรือไม่?", a: "ใช่ ทุกบริษัทเช่ารถผ่านการตรวจสอบ — ใบอนุญาตประกอบการ ตัวตน และการตรวจสอบการดำเนินงาน — ก่อนจะลงประกาศได้ บริษัทที่ยืนยันแล้วจะมีเครื่องหมายถูกสีน้ำเงิน" },
  { q: "เช่ารถในดูไบราคาเท่าไหร่?", a: "รถประหยัดเริ่มต้น 79-150 AED/วัน รถ SUV เริ่มต้น 250 AED/วัน รถหรูและรถสปอร์ต 500-5,000 AED/วัน การเช่ารายเดือนลดได้สูงสุด 40% จากราคารายวัน" },
  { q: "ฉันเช่ารถในฐานะนักท่องเที่ยวได้ไหม?", a: "ได้ นักท่องเที่ยวต้องมีหนังสือเดินทาง ใบขับขี่ของประเทศตน (ถือมาแล้ว 1 ปีขึ้นไป) ใบขับขี่สากล (สำหรับสัญชาติส่วนใหญ่) และบัตรเครดิตสำหรับเงินมัดจำ" },
  { q: "โทรต่างประเทศฟรีคืออะไร?", a: "การโทรวิดีโอผ่านเบราว์เซอร์ฟรีกับบริษัทเช่ารถ ไม่มีค่าโทรต่างประเทศ มีประโยชน์เมื่อคุณวางแผนการเดินทางจากต่างประเทศและต้องการพูดคุยกับบริษัทก่อนจอง" },
  { q: "ให้บริการเมืองนอกดูไบไหม?", a: "ใช่ — ทั่วทุกรัฐของ UAE (อาบูดาบี ชาร์จาห์ อัจมาน ราสอัลไคมาห์ ฟูไจราห์ อุมม์อัลไกวน์ อัลไอน์) และเมืองใหญ่ทั้งหมดในซีเรีย (ดามัสกัส อะเลปโป ลาตาเกีย ฮอมส์ ฮามา ทาร์ทัส อิดลิบ ดารา)" },
  { q: "รีวิวได้รับการยืนยันอย่างไร?", a: "รีวิวดึงมาจากโปรไฟล์ Google Business อย่างเป็นทางการของแต่ละบริษัทเช่ารถ และจากลูกค้า Auto to Rental ที่ยืนยันแล้ว เราไม่อนุญาตให้มีรีวิวปลอม" },
  { q: "อายุขั้นต่ำในการเช่ารถคือเท่าไหร่?", a: "21 ปีสำหรับรถประหยัดและ SUV ส่วนใหญ่ 25 ปีสำหรับรถหรู รถสปอร์ต และ SUV ระดับพรีเมียม บางบริษัทอนุญาตให้ผู้ที่อายุต่ำกว่า 25 ปีเช่าได้โดยมีค่าธรรมเนียมผู้ขับขี่อายุน้อย — ตรวจสอบประกาศหรือสอบถามบริษัท" },
  { q: "ราคาเช่ารวมประกันหรือไม่?", a: "ประกันบุคคลที่สามขั้นพื้นฐานรวมอยู่แล้วตามกฎหมายในทุกการเช่า บริษัทส่วนใหญ่ยังรวมประกันความเสียหายจากการชน (CDW) พร้อมค่าเสียหายส่วนแรก ประกันเต็มรูปแบบแบบไม่มีค่าเสียหายส่วนแรกมักเป็นบริการเสริมที่ต้องจ่ายเพิ่ม — ยืนยันกับบริษัทก่อนรับรถ" },
  { q: "ฉันต้องวางเงินมัดจำไหม?", a: "ใช่ บริษัทเช่ารถส่วนใหญ่จะกันวงเงิน 1,000-5,000 AED บนบัตรเครดิตของคุณเป็นเงินมัดจำ คืนให้หลังคืนรถโดยไม่มีความเสียหาย รถหรูต้องใช้เงินมัดจำสูงกว่า บางบริษัทรับเงินมัดจำเป็นเงินสดแต่นิยมบัตรเครดิตมากกว่า" },
  { q: "ส่งรถไปที่โรงแรมหรือสนามบินได้ไหม?", a: "บริษัทส่วนใหญ่ส่งรถฟรีภายในรัฐเดียวกัน การรับ/ส่งที่สนามบินมักฟรีหรือมีค่าธรรมเนียมเล็กน้อย (50-150 AED) ยืนยันค่าส่งและเวลาเมื่อติดต่อบริษัทผ่าน WhatsApp" },
  { q: "ถ้าฉันต้องยกเลิกล่ะ?", a: "เนื่องจากคุณจองกับบริษัทเช่ารถโดยตรง เงื่อนไขการยกเลิกกำหนดโดยบริษัท ส่วนใหญ่อนุญาตให้ยกเลิกฟรีได้ถึง 24-48 ชั่วโมงก่อนรับรถ ยืนยันนโยบายการยกเลิกเป็นลายลักษณ์อักษรบน WhatsApp ก่อนชำระเงินเสมอ" },
  { q: "เช่ารายเดือนแทนรายวันได้ไหม?", a: "ได้ — การเช่ารายเดือนได้รับความนิยมมากและประหยัดได้สูงสุด 40% เทียบกับราคารายวัน กรองตาม «รายเดือน» ในหน้าค้นหา หรือสอบถามบริษัทใดก็ได้โดยตรงเกี่ยวกับข้อเสนอรายเดือน มีดีลระยะยาว (3 เดือนขึ้นไป) พร้อมส่วนลดเพิ่มเติมด้วย" },
  { q: "มีการจำกัดระยะทางไหม?", a: "การเช่ารายวันส่วนใหญ่ให้ฟรี 200-300 กม./วัน การเช่ารายเดือนมักรวม 3,500-5,000 กม./เดือนฟรี ระยะทางส่วนเกินคิด 0.30-1.00 AED ต่อกม. ขึ้นอยู่กับประเภทรถ ยืนยันกับบริษัทก่อนเซ็นสัญญา" },
  { q: "ขับรถไปโอมานหรือประเทศ GCC อื่นได้ไหม?", a: "โดยทั่วไปได้ แต่ต้องมีใบอนุญาตข้ามพรมแดนพิเศษจากบริษัทเช่ารถ (ประมาณ 150-300 AED) และประกันเพิ่มเติม แจ้งบริษัทล่วงหน้าว่าคุณวางแผนขับไปประเทศใดบ้าง" },
  { q: "ต้องใช้เอกสารอะไรตอนรับรถ?", a: "ใบขับขี่ที่ใช้ได้ (UAE สำหรับผู้พำนัก ใบขับขี่ประเทศตน + ใบขับขี่สากลสำหรับนักท่องเที่ยว) Emirates ID หรือหนังสือเดินทาง และบัตรเครดิตที่ใช้วางมัดจำ เจ้าหน้าที่จะตรวจและถ่ายรูปรถพร้อมกับคุณตอนส่งมอบ" },
  { q: "รวมน้ำมันหรือต้องเติมเอง?", a: "นโยบายมาตรฐานคือเต็มถังต่อเต็มถัง: รับรถน้ำมันเต็มถัง คืนเต็มถัง บางบริษัทให้เต็มถังต่อถังว่าง (จ่ายค่าน้ำมันเต็มถังล่วงหน้า คืนรถถังว่างได้) ตรวจสอบใบเสร็จตอนรับรถเสมอ" },
  { q: "เพิ่มผู้ขับขี่คนที่สองได้ไหม?", a: "ได้ บริษัทส่วนใหญ่อนุญาตให้เพิ่มผู้ขับขี่หนึ่งคนฟรีหากแสดงใบขับขี่ตอนรับรถ ผู้ขับขี่เพิ่มคิดคนละ 25-75 AED ระบุผู้ขับขี่ทุกคนในสัญญาเช่าเสมอ — การขับโดยไม่มีประกันทำให้กรมธรรม์เป็นโมฆะ" },
  { q: "จะรายงานปัญหาการเช่าได้อย่างไร?", a: "ติดต่อบริษัทเช่ารถโดยตรงก่อน หากไม่ได้รับการแก้ไข คลิกปุ่มรายงานบนประกาศใดก็ได้และเลือกเหตุผล — ทีมงานของเราตรวจสอบทุกรายงานภายใน 24 ชั่วโมงและอาจระงับบริษัทที่ไม่ปฏิบัติตาม" },
]

const ru: Faq[] = [
  { q: "Как работает Auto to Rental?", a: "Просматривайте более 1200 арендных автомобилей в ОАЭ и Сирии. Найдя подходящий, свяжитесь с компанией напрямую через WhatsApp, по телефону или бесплатным международным звонком. Согласуйте с ней цену и получение авто. Auto to Rental не берёт комиссию." },
  { q: "Плачу ли я какую-либо комиссию Auto to Rental?", a: "Нет. Клиенты не платят ничего. Мы никогда не берём сборы за бронирование, комиссии или наценки. Цена в объявлении — это то, что вы платите компании напрямую." },
  { q: "Проверены ли арендные компании?", a: "Да. Каждая компания проходит проверку — лицензия, личность и операционные проверки — прежде чем сможет публиковать объявления. У проверенных компаний есть синяя галочка." },
  { q: "Сколько стоит аренда авто в Дубае?", a: "Эконом-класс от 79-150 AED/день. Внедорожники от 250 AED/день. Люкс и спорткары от 500-5000 AED/день. Месячная аренда даёт скидку до 40% от дневных тарифов." },
  { q: "Могу ли я арендовать авто как турист?", a: "Да. Туристам нужен паспорт, водительские права своей страны (стаж от 1 года), международное водительское удостоверение (для большинства национальностей) и кредитная карта для залога." },
  { q: "Что такое бесплатный международный звонок?", a: "Бесплатный видеозвонок через браузер с компанией по аренде. Без международных телефонных сборов. Удобно, когда вы планируете поездку из-за рубежа и хотите поговорить с компанией до бронирования." },
  { q: "Обслуживаете ли вы города за пределами Дубая?", a: "Да — по всем эмиратам ОАЭ (Абу-Даби, Шарджа, Аджман, Рас-эль-Хайма, Фуджейра, Умм-эль-Кайвайн, Аль-Айн) и во всех крупных городах Сирии (Дамаск, Алеппо, Латакия, Хомс, Хама, Тартус, Идлиб, Дараа)." },
  { q: "Как проверяются отзывы?", a: "Отзывы берутся из официального профиля Google Business каждой компании и от проверенных клиентов Auto to Rental. Мы не допускаем фальшивых отзывов." },
  { q: "Каков минимальный возраст для аренды авто?", a: "21 год для большинства эконом-моделей и внедорожников. 25 лет для люкса, спорткаров и премиум-внедорожников. Некоторые компании разрешают аренду до 25 лет с надбавкой для молодых водителей — смотрите объявление или спросите компанию." },
  { q: "Включена ли страховка в стоимость аренды?", a: "Базовая страховка ответственности перед третьими лицами включена по закону в каждую аренду. Большинство компаний также включают CDW (страхование ущерба при столкновении) с франшизой. Полная страховка без франшизы обычно платная опция — уточните у компании до получения авто." },
  { q: "Нужен ли залог?", a: "Да. Большинство компаний блокируют 1000-5000 AED на вашей кредитной карте как залог, возвращаемый после возврата неповреждённого авто. Для люкс-авто нужны бóльшие залоги. Некоторые компании принимают наличные, но предпочтительна кредитная карта." },
  { q: "Можно ли доставить авто в отель или аэропорт?", a: "Большинство компаний предлагают бесплатную доставку в пределах одного эмирата. Получение/возврат в аэропорту обычно бесплатны или за небольшую плату (50-150 AED). Уточните стоимость и время доставки при обращении в WhatsApp." },
  { q: "Что если мне нужно отменить?", a: "Поскольку вы бронируете напрямую у компании, условия отмены устанавливает она. Большинство разрешают бесплатную отмену за 24-48 часов до получения. Всегда подтверждайте политику отмены письменно в WhatsApp перед оплатой." },
  { q: "Можно ли арендовать помесячно вместо посуточно?", a: "Да — месячная аренда очень популярна и экономит до 40% по сравнению с дневными тарифами. Отфильтруйте по «Месяц» на странице поиска или спросите любую компанию о месячных предложениях. Доступны и долгосрочные сделки (от 3 месяцев) с доп. скидкой." },
  { q: "Действуют ли лимиты пробега?", a: "Большинство суточных аренд включают 200-300 км/день бесплатно. Месячные обычно включают 3500-5000 км/месяц бесплатно. Сверхлимитный км стоит 0,30-1,00 AED в зависимости от категории. Уточните у компании до подписания." },
  { q: "Можно ли поехать на авто в Оман или другую страну Залива?", a: "Обычно да, но требуется специальное разрешение на пересечение границы от компании (около 150-300 AED) и доп. страховка. Заранее сообщите компании, в какие страны планируете ехать." },
  { q: "Какие документы нужны при получении?", a: "Действующие права (ОАЭ для резидентов; права своей страны + МВУ для туристов), Emirates ID или паспорт, и кредитная карта, использованная для залога. Агент осматривает и фотографирует авто вместе с вами при передаче." },
  { q: "Включено ли топливо или нужно заправлять?", a: "Стандартная политика — «полный-к-полному»: получаете с полным баком, возвращаете с полным. Некоторые предлагают «полный-к-пустому» (платите за полный бак заранее, возвращаете пустым). Всегда проверяйте чек при получении." },
  { q: "Можно ли добавить второго водителя?", a: "Да. Большинство компаний разрешают одного доп. водителя бесплатно при предъявлении его прав при получении. Каждый доп. водитель стоит 25-75 AED. Всегда вписывайте всех водителей в договор — вождение без страховки аннулирует полис." },
  { q: "Как сообщить о проблеме с арендой?", a: "Сначала свяжитесь с компанией напрямую. Если не решено, нажмите кнопку «Пожаловаться» в любом объявлении и выберите причину — наша команда рассматривает каждую жалобу в течение 24 часов и может приостановить нарушителей." },
]

const ur: Faq[] = [
  { q: "Auto to Rental کیسے کام کرتا ہے؟", a: "UAE اور شام میں 1,200 سے زائد کرایہ کی گاڑیاں دیکھیں۔ پسندیدہ گاڑی ملنے پر، کرایہ کمپنی سے براہ راست WhatsApp، فون یا مفت بین الاقوامی کال کے ذریعے رابطہ کریں۔ ان کے ساتھ قیمت اور پک اپ طے کریں۔ Auto to Rental کوئی کمیشن نہیں لیتا۔" },
  { q: "کیا مجھے Auto to Rental کو کوئی فیس دینی ہوگی؟", a: "نہیں۔ گاہک کچھ نہیں دیتے۔ ہم کبھی بکنگ فیس، کمیشن یا اضافی قیمت نہیں لیتے۔ فہرست میں نظر آنے والی قیمت وہی ہے جو آپ کرایہ کمپنی کو براہ راست ادا کرتے ہیں۔" },
  { q: "کیا کرایہ کمپنیاں تصدیق شدہ ہیں؟", a: "جی ہاں۔ ہر کرایہ کمپنی فہرست شائع کرنے سے پہلے جانچ سے گزرتی ہے — تجارتی لائسنس، شناخت اور آپریشنل جانچ۔ تصدیق شدہ کمپنیوں پر نیلا نشان ہوتا ہے۔" },
  { q: "دبئی میں گاڑی کرایہ پر لینے کی لاگت کتنی ہے؟", a: "اکانومی گاڑیاں 79-150 درہم/دن سے۔ SUV 250 درہم/دن سے۔ پرتعیش اور اسپورٹس گاڑیاں 500-5,000 درہم/دن۔ ماہانہ کرایہ روزانہ نرخوں پر 40% تک رعایت دیتا ہے۔" },
  { q: "کیا میں سیاح کے طور پر گاڑی کرایہ پر لے سکتا ہوں؟", a: "جی ہاں۔ سیاحوں کو پاسپورٹ، اپنے ملک کا ڈرائیونگ لائسنس (1 سال یا زیادہ پرانا)، بین الاقوامی ڈرائیونگ پرمٹ (زیادہ تر قومیتوں کے لیے) اور سیکیورٹی ڈپازٹ کے لیے کریڈٹ کارڈ درکار ہے۔" },
  { q: "مفت بین الاقوامی کال کیا ہے؟", a: "کرایہ کمپنی کے ساتھ براؤزر پر مبنی مفت ویڈیو کال۔ کوئی بین الاقوامی فون چارجز نہیں۔ مفید ہے جب آپ بیرون ملک سے اپنا سفر منصوبہ بنا رہے ہوں اور بکنگ سے پہلے کمپنی سے بات کرنا چاہتے ہوں۔" },
  { q: "کیا آپ دبئی سے باہر کے شہروں میں خدمات فراہم کرتے ہیں؟", a: "جی ہاں — UAE کی تمام امارات (ابوظہبی، شارجہ، عجمان، راس الخیمہ، فجیرہ، ام القیوین، العین) اور شام کے تمام بڑے شہروں (دمشق، حلب، لاذقیہ، حمص، حماہ، طرطوس، ادلب، درعا) میں۔" },
  { q: "جائزوں کی تصدیق کیسے ہوتی ہے؟", a: "جائزے ہر کرایہ کمپنی کے سرکاری Google Business پروفائل اور تصدیق شدہ Auto to Rental گاہکوں سے لیے جاتے ہیں۔ ہم جعلی جائزوں کی اجازت نہیں دیتے۔" },
  { q: "گاڑی کرایہ پر لینے کی کم از کم عمر کیا ہے؟", a: "زیادہ تر اکانومی اور SUV ماڈلز کے لیے 21 سال۔ پرتعیش، اسپورٹس اور پریمیم SUV کے لیے 25 سال۔ کچھ کمپنیاں 25 سال سے کم عمر والوں کو نوجوان ڈرائیور سرچارج کے ساتھ اجازت دیتی ہیں — فہرست دیکھیں یا کمپنی سے پوچھیں۔" },
  { q: "کیا انشورنس کرایہ کی قیمت میں شامل ہے؟", a: "بنیادی تھرڈ پارٹی انشورنس قانوناً ہر کرایہ میں شامل ہے۔ زیادہ تر کمپنیاں CDW (تصادم نقصان معافی) بھی شامل کرتی ہیں جس میں ایک قابل کٹوتی رقم ہوتی ہے۔ صفر کٹوتی والی مکمل انشورنس عموماً ادائیگی والی اضافی سہولت ہے — پک اپ سے پہلے کمپنی سے تصدیق کریں۔" },
  { q: "کیا مجھے سیکیورٹی ڈپازٹ کی ضرورت ہے؟", a: "جی ہاں۔ زیادہ تر کمپنیاں آپ کے کریڈٹ کارڈ پر 1,000-5,000 درہم بطور ڈپازٹ روک لیتی ہیں، جو گاڑی بلا نقصان واپس کرنے پر واپس ہو جاتا ہے۔ پرتعیش گاڑیوں کو بڑے ڈپازٹ کی ضرورت ہوتی ہے۔ کچھ کمپنیاں نقد ڈپازٹ قبول کرتی ہیں مگر کریڈٹ کارڈ کو ترجیح دی جاتی ہے۔" },
  { q: "کیا گاڑی میرے ہوٹل یا ایئرپورٹ پہنچائی جا سکتی ہے؟", a: "زیادہ تر کمپنیاں ایک ہی امارت کے اندر مفت ڈیلیوری پیش کرتی ہیں۔ ایئرپورٹ پک اپ/ڈراپ آف عموماً مفت یا معمولی فیس (50-150 درہم) پر ہوتا ہے۔ WhatsApp پر کمپنی سے رابطہ کرتے وقت ڈیلیوری کی لاگت اور وقت کی تصدیق کریں۔" },
  { q: "اگر مجھے منسوخ کرنا پڑے تو؟", a: "چونکہ آپ کرایہ کمپنی سے براہ راست بکنگ کرتے ہیں، منسوخی کی شرائط وہی طے کرتے ہیں۔ زیادہ تر کمپنیاں پک اپ سے 24-48 گھنٹے پہلے تک مفت منسوخی کی اجازت دیتی ہیں۔ ادائیگی سے پہلے ہمیشہ WhatsApp پر منسوخی کی پالیسی تحریری طور پر تصدیق کریں۔" },
  { q: "کیا میں روزانہ کے بجائے ماہانہ کرایہ پر لے سکتا ہوں؟", a: "جی ہاں — ماہانہ کرایہ بہت مقبول ہے اور روزانہ نرخوں کے مقابلے 40% تک بچت کرتا ہے۔ تلاش کے صفحے پر «ماہانہ» سے فلٹر کریں، یا کسی بھی کمپنی سے براہ راست ان کے ماہانہ آفرز پوچھیں۔ طویل مدتی (3+ ماہ) ڈیلز بھی اضافی رعایت کے ساتھ دستیاب ہیں۔" },
  { q: "کیا مائلیج کی حد لاگو ہوتی ہے؟", a: "زیادہ تر روزانہ کرایے 200-300 کلومیٹر/دن مفت دیتے ہیں۔ ماہانہ کرایے عموماً 3,500-5,000 کلومیٹر/ماہ مفت شامل کرتے ہیں۔ اضافی کلومیٹر گاڑی کی قسم کے مطابق 0.30-1.00 درہم فی کلومیٹر چارج ہوتا ہے۔ دستخط سے پہلے کمپنی سے تصدیق کریں۔" },
  { q: "کیا میں گاڑی عمان یا کسی اور خلیجی ملک لے جا سکتا ہوں؟", a: "عموماً جی ہاں، مگر اس کے لیے کرایہ کمپنی سے خصوصی سرحد عبور پرمٹ (تقریباً 150-300 درہم) اور اضافی انشورنس درکار ہے۔ کمپنی کو پہلے سے بتائیں کہ آپ کن ممالک میں ڈرائیو کرنے کا ارادہ رکھتے ہیں۔" },
  { q: "ڈیلیوری کے لیے مجھے کن دستاویزات کی ضرورت ہے؟", a: "ایک درست ڈرائیونگ لائسنس (رہائشیوں کے لیے UAE، سیاحوں کے لیے اپنے ملک کا لائسنس + IDP)، Emirates ID یا پاسپورٹ، اور ڈپازٹ کے لیے استعمال شدہ کریڈٹ کارڈ۔ ایجنٹ حوالگی کے وقت آپ کے ساتھ گاڑی کا معائنہ اور تصویر لیتا ہے۔" },
  { q: "کیا ایندھن شامل ہے یا مجھے دوبارہ بھرنا ہوگا؟", a: "معیاری پالیسی فُل ٹو فُل ہے: مکمل ٹینک کے ساتھ پک اپ، مکمل ٹینک کے ساتھ واپسی۔ کچھ کمپنیاں فُل ٹو ایمپٹی پیش کرتی ہیں (پہلے سے مکمل ٹینک کی ادائیگی، خالی واپس کریں)۔ پک اپ پر ہمیشہ رسید چیک کریں۔" },
  { q: "کیا میں دوسرا ڈرائیور شامل کر سکتا ہوں؟", a: "جی ہاں۔ زیادہ تر کمپنیاں ایک اضافی ڈرائیور مفت اجازت دیتی ہیں اگر اس کا لائسنس پک اپ پر دکھایا جائے۔ اضافی ڈرائیور ہر ایک 25-75 درہم۔ ہمیشہ تمام ڈرائیورز کو کرایہ معاہدے میں درج کریں — بغیر انشورنس ڈرائیونگ پالیسی کو کالعدم کر دیتی ہے۔" },
  { q: "میں کرایہ کے مسئلے کی اطلاع کیسے دوں؟", a: "پہلے کرایہ کمپنی سے براہ راست رابطہ کریں۔ اگر حل نہ ہو، کسی بھی فہرست پر «رپورٹ» بٹن دبائیں اور اپنی وجہ منتخب کریں — ہماری ٹیم ہر رپورٹ کا 24 گھنٹے میں جائزہ لیتی ہے اور غیر مطابق کمپنیوں کو معطل کر سکتی ہے۔" },
]

const FAQS: Partial<Record<Locale, Faq[]>> = { en, ar, es, zh, th, ru, ur }

export function getHomeFaqs(locale: Locale): Faq[] {
  return FAQS[locale] || FAQS[DEFAULT_LOCALE] || en
}
