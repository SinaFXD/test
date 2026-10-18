/**
 * Long-form copy for the historical presets (what happened, what the Fed did,
 * what came next). Kept out of `fa.ts` / `en.ts` so it loads only when a
 * historical preset is opened (lazy `PresetStory` chunk). Persian is the
 * source; English must match the same shape (enforced by `StoryMessages`).
 * Copy uses Latin digits; `PresetStory` applies the same digit/bidi handling
 * as `useT()`.
 */
import type { HistoryPresetId } from '../model/presets';

export interface Story {
  period: string;
  happened: string;
  fed: string;
  after: string;
}

export interface StoryMessages {
  labels: { happened: string; fed: string; after: string; caveat: string };
  stories: Record<HistoryPresetId, Story>;
}

const fa: StoryMessages = {
  labels: {
    happened: 'چه شد',
    fed: 'واکنش فدرال',
    after: 'بعد از آن واقعاً چه شد',
    caveat:
      'این سناریو همان نوع شوک را روی اقتصاد امروز (با نرخ، تورم و بیکاری امروز) اجرا می‌کند و تکرار دقیق تاریخ نیست. مدل ساده است و تکان‌های شدید، مثل جهش بیکاری در 2008 و 2020، را کمتر از واقعیت نشان می‌دهد.',
  },
  stories: {
    gfc2008: {
      period: '2007 تا 2009',
      happened:
        'حباب مسکن ترکید، وام‌های پرخطر نکول شدند و با ورشکستگی لمن برادرز در سپتامبر 2008 بازار اعتبار قفل شد. تولید حدود 4٪ کوچک شد، بیکاری از حدود 5٪ به 10٪ رسید، S&P 500 حدود 57٪ ریخت و نفت از 147 به حدود 35 دلار افتاد.',
      fed: 'نرخ را در 15 ماه از 5.25٪ به نزدیک صفر رساند (دسامبر 2008)، خرید اوراق (QE) را شروع کرد و تا آخر 2015 نرخ را صفر نگه داشت.',
      after:
        'بهبود کند بود: بیکاری تا 2015 بالای 5٪ ماند و تورم بیشتر دههٔ بعد زیر 2٪ بود. بورس در 2013 به سقف قبلی‌اش برگشت.',
    },
    oil2008: {
      period: '2007 تا 2008',
      happened:
        'تقاضای چین و کشورهای نوظهور و عرضهٔ محدود، نفت را از حدود 70 دلار در اواسط 2007 به رکورد 147 دلار در ژوئیهٔ 2008 رساند. تورم کل PCE به حدود 4.5٪ رسید ولی تورم هسته حدود 2.4٪ ماند.',
      fed: 'به خاطر بحران مسکن از قبل در حال کاهش نرخ بود و از آوریل 2008 نرخ را روی 2٪ نگه داشت؛ به تورمِ ناشی از نفت واکنش نشان نداد.',
      after:
        'با شروع بحران مالی، نفت تا پایان 2008 به حدود 35 دلار سقوط کرد و تورم کل در 2009 منفی شد. درس اصلی: شوک نفتی معمولاً موقتی است و فدرال بیشتر به تورم هسته نگاه می‌کند.',
    },
    euro2011: {
      period: '2010 تا 2012',
      happened:
        'یونان، ایرلند و پرتغال به کمک مالی نیاز پیدا کردند و نگرانی به ایتالیا و اسپانیا رسید. در اوت 2011، پس از کشمکش بر سر سقف بدهی، S&P رتبهٔ اعتباری آمریکا را از AAA پایین آورد و S&P 500 حدود 19٪ افت کرد.',
      fed: 'نرخ از قبل صفر بود؛ فدرال وعده داد آن را دست‌کم تا اواسط 2013 صفر نگه دارد و «عملیات تویست» (2011) و سپس QE3 (2012) را اجرا کرد.',
      after:
        'با جملهٔ معروف دراگی در ژوئیهٔ 2012 («هر کاری لازم باشد») بحران آرام شد. اقتصاد آمریکا آهسته رشد کرد و بازدهی 10 ساله به پایین‌ترین سطح تا آن زمان (حدود 1.4٪) رسید.',
    },
    taper2013: {
      period: '2013',
      happened:
        'در مه 2013 برنانکی گفت فدرال ممکن است به‌زودی خرید اوراق (QE) را کم کند. بدون هیچ افزایش نرخی، بازدهی 10 ساله از حدود 1.6٪ به حدود 3٪ در سپتامبر رسید و نرخ وام مسکن حدود 1 واحد درصد بالا رفت.',
      fed: 'در سپتامبر 2013 با عقب انداختن کاهش خرید، بازار را غافلگیر کرد؛ کاهش خرید را از ژانویهٔ 2014 شروع کرد و اولین افزایش نرخ را در دسامبر 2015 انجام داد.',
      after:
        'بازار مسکن کمی کند شد و بازارهای نوظهور ضربه خوردند، ولی اقتصاد آمریکا به رشد ادامه داد. این مدل «صرف ریسک» اوراق بلندمدت را ندارد، پس جهش بازدهی 10 ساله را کمتر از 2013 نشان می‌دهد.',
    },
    oil2015: {
      period: '2014 تا 2016',
      happened:
        'افزایش تولید نفت شیل آمریکا و تصمیم اوپک به کم نکردن تولید، برنت را از حدود 115 دلار (ژوئن 2014) به زیر 30 دلار (ژانویهٔ 2016) رساند. دلار حدود 20٪ قوی شد، سرمایه‌گذاری بخش انرژی سقوط کرد و کاهش ارزش یوان در 2015 بازارها را لرزاند.',
      fed: 'افزایش نرخ را عقب انداخت: اولین افزایش در دسامبر 2015 و دومی فقط یک سال بعد، در دسامبر 2016.',
      after:
        'تورم کل PCE در 2015 نزدیک صفر بود ولی بیکاری به کاهش ادامه داد. نفت تا پایان 2016 به بالای 50 دلار برگشت.',
    },
    tax2018: {
      period: '2017 تا 2018',
      happened:
        'قانون کاهش مالیات (دسامبر 2017) مالیات شرکت‌ها را از 35٪ به 21٪ رساند و هزینهٔ دولت هم زیاد شد. اقتصاد در 2018 نزدیک 3٪ رشد کرد و بیکاری به 3.7٪، پایین‌ترین سطح از 1969، رسید.',
      fed: 'در 2018 چهار بار نرخ را بالا برد (تا 2.25 تا 2.5٪) و همزمان ترازنامه‌اش را کوچک کرد.',
      after:
        'در سه ماههٔ آخر 2018 بورس حدود 20٪ ریخت. پاول در ژانویهٔ 2019 عقب‌نشینی کرد: افزایش نرخ متوقف شد و در 2019 سه بار کاهش یافت.',
    },
    trade2019: {
      period: '2018 تا 2019',
      happened:
        'آمریکا و چین در چند مرحله روی صدها میلیارد دلار کالا تعرفه گذاشتند. سرمایه‌گذاری شرکت‌ها و بخش صنعت ضعیف شد و در اوت 2019 منحنی بازدهی معکوس شد.',
      fed: 'در ژوئیه، سپتامبر و اکتبر 2019 هر بار 25 واحد پایه نرخ را کم کرد (در مجموع 75) و اسمش را «تعدیل میان‌دوره‌ای» گذاشت.',
      after:
        'بیکاری حدود 3.5٪ ماند و رکودی رخ نداد. در ژانویهٔ 2020 توافق «فاز یک» امضا شد و چند هفته بعد کرونا همه چیز را تغییر داد.',
    },
    covid2020: {
      period: '2020',
      happened:
        'قرنطینه‌ها در مارس 2020 بخش بزرگی از اقتصاد را بست. تولید در دو فصل حدود 10٪ کوچک شد، بیکاری از 3.5٪ به 14.8٪ (آوریل) رسید و قیمت نفت آمریکا برای یک روز منفی شد.',
      fed: 'در دو جلسهٔ اضطراری (3 و 15 مارس) نرخ را 150 واحد پایه کم کرد و به صفر رساند، خرید نامحدود اوراق را شروع کرد و تا مارس 2022 نرخ را صفر نگه داشت. دولت هم بیش از 5 هزار میلیارد دلار محرک مالی تزریق کرد.',
      after:
        'بهبود بسیار سریع بود: بورس در اوت 2020 به سقف تازه رسید و بیکاری تا اوایل 2022 زیر 4٪ آمد. اما ترکیب محرک بزرگ و نرخ صفر، زمینهٔ تورم 2021 و 2022 را فراهم کرد.',
    },
    surge2021: {
      period: '2021',
      happened:
        'گره در زنجیرهٔ تأمین، تقاضای انباشته پس از بازگشایی و محرک مالی بزرگ، تورم هسته PCE را از حدود 1.5٪ در اوایل 2021 به حدود 5.5٪ در اوایل 2022 رساند. تورم CPI در ژوئن 2022 به 9.1٪ رسید.',
      fed: 'تا مدت‌ها تورم را «گذرا» خواند و نرخ را تا مارس 2022 صفر نگه داشت؛ خرید اوراق را هم تا همان زمان ادامه داد.',
      after:
        'فدرال مجبور شد با سریع‌ترین افزایش نرخ در 40 سال جبران کند. این سناریو را با «افزایش سریع نرخ 2022» مقایسه کنید: همان شوک تورمی، با واکنش متفاوت فدرال.',
    },
    hikes2022: {
      period: '2022 تا 2023',
      happened:
        'با تورمی در بالاترین سطح 40 سال، فدرال از مارس 2022 تا ژوئیهٔ 2023 نرخ را 525 واحد پایه بالا برد، از جمله چهار افزایش 75 واحدی پشت سر هم. بازدهی 10 ساله از حدود 1.5٪ به نزدیک 5٪ رسید و S&P 500 در 2022 حدود 25٪ افت کرد.',
      fed: 'نرخ را از نزدیک صفر به 5.25 تا 5.5٪ رساند، از ژوئن 2022 ترازنامه را کوچک کرد و تا سپتامبر 2024 نرخ را بالا نگه داشت.',
      after:
        'تورم بدون رکود پایین آمد (تورم هسته PCE تا 2024 به زیر 3٪ رسید) و بیکاری فقط از 3.4٪ به حدود 4.2٪ رفت؛ به آن «فرود نرم» گفتند. بخشی از این موفقیت از بهبود زنجیرهٔ تأمین بود که این مدل کامل نمی‌بیند.',
    },
    energy2022: {
      period: '2022',
      happened:
        'پس از حملهٔ روسیه به اوکراین در فوریهٔ 2022، نفت برنت در مارس به حدود 128 دلار رسید، قیمت گاز در اروپا چند برابر شد و بنزین در آمریکا از 5 دلار برای هر گالن گذشت. قیمت گندم و کود هم جهش کرد.',
      fed: 'در همان ماه (مارس 2022) چرخهٔ افزایش نرخ را شروع کرد؛ شوک انرژی فشار برای افزایش سریع‌تر را بیشتر کرد.',
      after:
        'تورم کل در آمریکا در ژوئن 2022 به اوج رسید و نفت تا پایان سال به حدود 80 دلار برگشت. اروپا به خاطر وابستگی به گاز روسیه بسیار بیشتر از آمریکا آسیب دید.',
    },
    svb2023: {
      period: '2023',
      happened:
        'در مارس 2023 سیلیکون ولی بانک و سیگنچر بانک ورشکست شدند، کردیت سوئیس با ادغام در UBS نجات یافت و در ماه مه فرست ریپابلیک هم سقوط کرد. بانک‌ها وام‌دهی را سخت‌تر کردند.',
      fed: 'با یک ابزار وام اضطراری (BTFP) سپرده‌گذاران را آرام کرد، ولی باز هم در مارس، مه و ژوئیهٔ 2023 هر بار 25 واحد پایه نرخ را بالا برد و بعد متوقف شد.',
      after:
        'بحران به کل نظام بانکی سرایت نکرد و اقتصاد در 2023 بیش از 2.5٪ رشد کرد. اثر اصلی، سخت‌تر شدن وام برای کسب‌وکارهای کوچک بود.',
    },
    cuts2024: {
      period: '2024',
      happened:
        'تورم به سمت 2٪ برگشت و بیکاری تا ژوئیهٔ 2024 به 4.3٪ رسید. ترس از رکود در 5 اوت 2024 بازارهای جهانی را لرزاند (همراه با بسته شدن معاملات «کری ترید» ین).',
      fed: 'در سپتامبر 2024 با 50 واحد پایه شروع کرد و تا دسامبر در مجموع 100 واحد پایه نرخ را کم کرد (به 4.25 تا 4.5٪).',
      after:
        'رکود نیامد و فدرال بیشتر 2025 دست نگه داشت. نکتهٔ جالب: بازدهی 10 ساله بعد از شروع کاهش نرخ حدود 1 واحد درصد بالا رفت (از حدود 3.6٪ به حدود 4.8٪ در ژانویهٔ 2025).',
    },
    tariffs2025: {
      period: '2025',
      happened:
        'در 2 آوریل 2025 آمریکا تعرفه‌های گسترده‌ای اعلام کرد و میانگین تعرفهٔ مؤثر به بالاترین سطح از دههٔ 1930 رسید. S&P 500 از اوج فوریه تا 8 آوریل حدود 19٪ ریخت و بعد از اعلام توقف 90 روزه به‌سرعت برگشت.',
      fed: '«صبر و تماشا» را انتخاب کرد و نرخ را تا سپتامبر 2025 روی 4.25 تا 4.5٪ نگه داشت؛ بعد در چند مرحله کاهش داد.',
      after:
        'بورس تا اواخر ژوئن به سقف تازه رسید. قیمت کالاها به‌تدریج بالا رفت و تورم هسته بالای 2٪ ماند، ولی تا پایان 2025 رکودی رخ نداد.',
    },
  },
};

const en: StoryMessages = {
  labels: {
    happened: 'What happened',
    fed: 'What the Fed did',
    after: 'What actually came next',
    caveat:
      'This preset runs the same kind of shock on today’s economy (today’s rates, inflation and unemployment); it is not a replay of history. The model is simple and understates violent swings such as the jump in unemployment in 2008 and 2020.',
  },
  stories: {
    gfc2008: {
      period: '2007–2009',
      happened:
        'The housing bubble burst, subprime loans defaulted and Lehman Brothers’ failure in September 2008 froze credit markets. Output shrank about 4%, unemployment rose from about 5% to 10%, the S&P 500 fell about 57% and oil dropped from $147 to about $35.',
      fed: 'Cut from 5.25% to near zero within 15 months (December 2008), launched bond buying (QE) and kept rates at zero until late 2015.',
      after:
        'The recovery was slow: unemployment stayed above 5% until 2015 and inflation ran below 2% for most of the next decade. Stocks regained their old peak in 2013.',
    },
    oil2008: {
      period: '2007–2008',
      happened:
        'Demand from China and other emerging economies plus tight supply lifted oil from about $70 in mid-2007 to a record $147 in July 2008. Headline PCE inflation reached about 4.5% while core stayed near 2.4%.',
      fed: 'Already cutting because of the housing bust, it held at 2% from April 2008 and did not react to oil-driven inflation.',
      after:
        'As the financial crisis hit, oil collapsed to about $35 by the end of 2008 and headline inflation turned negative in 2009. The lesson: oil shocks are usually temporary, and the Fed looks mostly at core inflation.',
    },
    euro2011: {
      period: '2010–2012',
      happened:
        'Greece, Ireland and Portugal needed bailouts and the fear spread to Italy and Spain. In August 2011, after a debt-ceiling standoff, S&P cut the U.S. rating from AAA and the S&P 500 fell about 19%.',
      fed: 'Rates were already at zero; the Fed promised to keep them there at least until mid-2013, ran “Operation Twist” (2011) and then QE3 (2012).',
      after:
        'Draghi’s “whatever it takes” (July 2012) calmed the crisis. The U.S. kept growing slowly and the 10-year yield hit what was then a record low (about 1.4%).',
    },
    taper2013: {
      period: '2013',
      happened:
        'In May 2013 Bernanke said the Fed might soon slow its bond buying (QE). Without any rate hike, the 10-year yield rose from about 1.6% to about 3% by September and mortgage rates rose about 1 percentage point.',
      fed: 'Surprised markets in September 2013 by delaying the taper; began tapering in January 2014 and made its first hike in December 2015.',
      after:
        'Housing slowed a little and emerging markets were hit, but the U.S. kept growing. This model has no term premium, so it shows a smaller 10-year jump than in 2013.',
    },
    oil2015: {
      period: '2014–2016',
      happened:
        'U.S. shale growth and OPEC’s refusal to cut output took Brent from about $115 (June 2014) to below $30 (January 2016). The dollar rose about 20%, energy investment collapsed and China’s 2015 devaluation rattled markets.',
      fed: 'Delayed liftoff: the first hike came in December 2015 and the second only a year later, in December 2016.',
      after:
        'Headline PCE inflation was near zero in 2015 but unemployment kept falling. Oil was back above $50 by the end of 2016.',
    },
    tax2018: {
      period: '2017–2018',
      happened:
        'The December 2017 tax law cut the corporate rate from 35% to 21% and government spending rose too. The economy grew close to 3% in 2018 and unemployment fell to 3.7%, the lowest since 1969.',
      fed: 'Hiked four times in 2018 (to 2.25–2.5%) while shrinking its balance sheet.',
      after:
        'Stocks fell about 20% in the fourth quarter of 2018. Powell pivoted in January 2019: hikes stopped and the Fed cut three times in 2019.',
    },
    trade2019: {
      period: '2018–2019',
      happened:
        'The U.S. and China imposed tariffs on hundreds of billions of dollars of goods in several rounds. Business investment and manufacturing weakened and the yield curve inverted in August 2019.',
      fed: 'Cut 25bp each in July, September and October 2019 (75bp in total), calling it a “mid-cycle adjustment”.',
      after:
        'Unemployment stayed near 3.5% and there was no recession. A “Phase One” deal was signed in January 2020 — and weeks later COVID changed everything.',
    },
    covid2020: {
      period: '2020',
      happened:
        'Lockdowns in March 2020 shut large parts of the economy. Output shrank about 10% in two quarters, unemployment jumped from 3.5% to 14.8% (April) and U.S. oil briefly traded below zero.',
      fed: 'Cut 150bp to zero at two emergency meetings (March 3 and 15), began unlimited bond buying and kept rates at zero until March 2022. Fiscal support topped $5 trillion.',
      after:
        'The rebound was very fast: stocks hit a new high in August 2020 and unemployment was below 4% by early 2022. But big stimulus plus zero rates set the stage for the 2021–22 inflation.',
    },
    surge2021: {
      period: '2021',
      happened:
        'Supply-chain snarls, pent-up demand after reopening and large stimulus pushed core PCE inflation from about 1.5% in early 2021 to about 5.5% in early 2022. CPI inflation peaked at 9.1% in June 2022.',
      fed: 'Called inflation “transitory” for months and kept rates at zero — and bond buying going — until March 2022.',
      after:
        'The Fed then had to catch up with the fastest hikes in 40 years. Compare with “2022 rapid hikes”: the same inflation shock, a different Fed response.',
    },
    hikes2022: {
      period: '2022–2023',
      happened:
        'With inflation at a 40-year high, the Fed raised rates 525bp from March 2022 to July 2023, including four 75bp hikes in a row. The 10-year yield went from about 1.5% to near 5% and the S&P 500 fell about 25% in 2022.',
      fed: 'Took rates from near zero to 5.25–5.5%, began shrinking its balance sheet in June 2022 and held rates high until September 2024.',
      after:
        'Inflation fell without a recession (core PCE was below 3% by 2024) and unemployment only rose from 3.4% to about 4.2% — a “soft landing”. Part of that luck came from healing supply chains, which this model only partly captures.',
    },
    energy2022: {
      period: '2022',
      happened:
        'After Russia invaded Ukraine in February 2022, Brent reached about $128 in March, European gas prices multiplied and U.S. gasoline topped $5 a gallon. Wheat and fertilizer prices jumped too.',
      fed: 'Began its hiking cycle that same month (March 2022); the energy shock added pressure to move faster.',
      after:
        'U.S. headline inflation peaked in June 2022 and oil was back near $80 by year-end. Europe, dependent on Russian gas, was hit far harder than the U.S.',
    },
    svb2023: {
      period: '2023',
      happened:
        'In March 2023 Silicon Valley Bank and Signature Bank failed, Credit Suisse was rescued by UBS, and First Republic collapsed in May. Banks tightened lending.',
      fed: 'Calmed depositors with an emergency lending facility (BTFP) but still hiked 25bp in March, May and July 2023, then paused.',
      after:
        'The stress did not spread across the banking system and the economy grew more than 2.5% in 2023. The main effect was tighter credit for small businesses.',
    },
    cuts2024: {
      period: '2024',
      happened:
        'Inflation moved back toward 2% and unemployment rose to 4.3% by July 2024. A recession scare shook global markets on August 5, 2024 (together with the unwinding of the yen carry trade).',
      fed: 'Started with 50bp in September 2024 and cut 100bp in total by December (to 4.25–4.5%).',
      after:
        'No recession came and the Fed held for most of 2025. Notably, the 10-year yield rose about 1 point after the cuts began (from about 3.6% to about 4.8% in January 2025).',
    },
    tariffs2025: {
      period: '2025',
      happened:
        'On April 2, 2025 the U.S. announced sweeping tariffs and the average effective tariff rate rose to its highest since the 1930s. The S&P 500 fell about 19% from its February peak to April 8, then rebounded quickly after a 90-day pause.',
      fed: 'Chose “wait and see”, holding at 4.25–4.5% until September 2025, then cut in steps.',
      after:
        'Stocks were at new highs by late June. Goods prices rose gradually and core inflation stayed above 2%, but there was no recession through the end of 2025.',
    },
  },
};

export const STORIES = { fa, en };
