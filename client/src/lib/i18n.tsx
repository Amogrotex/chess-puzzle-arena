import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'fa';

const en = {
  'brand.name': 'Puzzle Arena',
  'brand.tagline': 'Tactics, every day',

  'nav.puzzles': 'Puzzles',
  'nav.rush': 'Rush',
  'nav.daily': 'Daily',
  'nav.themes': 'Themes',
  'nav.learn': 'Learn',
  'nav.leaderboard': 'Leaderboard',
  'nav.profile': 'Profile',
  'nav.login': 'Log in',
  'nav.signup': 'Sign up',
  'nav.logout': 'Log out',
  'nav.guest': 'Guest',

  'home.title': 'Sharpen your tactics',
  'home.subtitle':
    'Thousands of real puzzles from rated games. Find the best move, grow your rating, keep the streak alive.',
  'home.start': 'Start training',
  'home.rush': 'Play Puzzle Rush',
  'home.daily': 'Daily puzzle',
  'home.statPuzzles': 'curated puzzles',
  'home.statThemes': 'tactical themes',
  'home.feature1.title': 'Adaptive difficulty',
  'home.feature1.text': 'Puzzles are picked around your rating, so every solve is exactly one step too hard.',
  'home.feature2.title': 'Real rating',
  'home.feature2.text': 'Every puzzle is rated. Solve it, gain points; miss it, lose a few. Watch the graph climb.',
  'home.feature3.title': 'Rush mode',
  'home.feature3.text': 'Three minutes, three lives, one goal: as many puzzles as you can handle.',
  'home.how': 'How it works',

  'trainer.yourMove': 'Your move',
  'trainer.opponentMove': 'Finding the best reply…',
  'trainer.bestMove': 'Best move!',
  'trainer.notQuite': 'Not quite — that is not the best move',
  'trainer.solved': 'Puzzle solved!',
  'trainer.failed': 'Puzzle missed',
  'trainer.hint': 'Hint',
  'trainer.solution': 'Solution',
  'trainer.retry': 'Retry',
  'trainer.skip': 'Skip',
  'trainer.next': 'Next puzzle',
  'trainer.yourRating': 'Your rating',
  'trainer.puzzleRating': 'Puzzle rating',
  'trainer.puzzle': 'Puzzle',
  'trainer.theme': 'Theme',
  'trainer.allThemes': 'All themes',
  'trainer.difficulty': 'Difficulty',
  'trainer.adaptive': 'Adaptive',
  'trainer.beginner': 'Beginner',
  'trainer.easy': 'Easy',
  'trainer.intermediate': 'Intermediate',
  'trainer.advanced': 'Advanced',
  'trainer.master': 'Master',
  'trainer.loading': 'Loading puzzle…',
  'trainer.solutionShown': 'Solution',
  'trainer.todaySolved': 'Solved today',
  'trainer.streak': 'Day streak',
  'trainer.accuracy': 'Accuracy',
  'trainer.findBestMove': 'Find the best move for {color}',
  'trainer.white': 'White',
  'trainer.black': 'Black',
  'trainer.promote': 'Choose a piece',
  'trainer.check': 'Check!',
  'trainer.mateHint': 'Checkmate is on the board',

  'rush.title': 'Puzzle Rush',
  'rush.subtitle': 'Solve as many puzzles as you can before the clock runs out. Three mistakes and it is over.',
  'rush.start': 'Start rush',
  'rush.duration': 'Duration',
  'rush.min': 'min',
  'rush.lives': 'Lives',
  'rush.score': 'Score',
  'rush.streak': 'Streak',
  'rush.timeUp': 'Time is up!',
  'rush.outOfLives': 'Out of lives!',
  'rush.finalScore': 'Final score',
  'rush.newBest': 'New personal best!',
  'rush.playAgain': 'Play again',
  'rush.rules': 'Rules',
  'rush.rule1': 'Every puzzle solved adds one point.',
  'rush.rule2': 'A wrong move costs one life and resets your streak.',
  'rush.rule3': 'The run ends when the timer hits zero or you lose all lives.',
  'rush.best': 'Best',
  'rush.correctMove': 'The move was',

  'daily.title': 'Daily puzzle',
  'daily.subtitle': 'One puzzle for everyone, every day. Solve it to keep your streak alive.',
  'daily.streak': 'Current streak',
  'daily.done': 'You already solved today’s puzzle',
  'daily.missedToday': 'Today’s puzzle is still waiting',
  'daily.comeBack': 'A new puzzle arrives in',
  'daily.share': 'Share result',
  'daily.copied': 'Copied to clipboard',
  'daily.history': 'Last two weeks',

  'themes.title': 'Train by theme',
  'themes.subtitle': 'Pick a motif and drill it until it is muscle memory.',
  'themes.all': 'Mixed puzzles',
  'themes.allText': 'A bit of everything, matched to your rating.',
  'themes.puzzles': 'puzzles',
  'themes.groupMates': 'Checkmate patterns',
  'themes.groupTactics': 'Tactics',
  'themes.groupEndgame': 'Endgames & phase',
  'themes.search': 'Search themes…',

  'profile.title': 'Profile',
  'profile.rating': 'Rating',
  'profile.solved': 'Puzzles solved',
  'profile.attempts': 'Total attempts',
  'profile.accuracy': 'Accuracy',
  'profile.avgTime': 'Avg. time',
  'profile.rushBest': 'Best rush',
  'profile.notPlayed': 'not played yet',
  'profile.ratingHistory': 'Rating history',
  'profile.noHistory': 'Solve a few puzzles to build your graph.',
  'profile.themeAccuracy': 'Accuracy by theme',
  'profile.recent': 'Recent activity',
  'profile.noRecent': 'No puzzles yet — go solve your first one.',
  'profile.memberSince': 'Member since',
  'profile.guestNote': 'You are training as a guest. Create an account to keep your progress on any device.',

  'leaderboard.title': 'Leaderboard',
  'leaderboard.subtitle': 'The sharpest tacticians in the arena.',
  'leaderboard.rating': 'By rating',
  'leaderboard.rush': 'By rush score',
  'leaderboard.rank': '#',
  'leaderboard.player': 'Player',
  'leaderboard.value': 'Rating',
  'leaderboard.score': 'Score',
  'leaderboard.empty': 'Nobody here yet — be the first.',

  'learn.title': 'How Puzzle Arena works',
  'learn.intro':
    'Every position comes from a real, rated game on Lichess. The opponent has just played — you have to find the only move that keeps the advantage, wins material or delivers mate.',
  'learn.h1': 'One move at a time',
  'learn.p1':
    'Play your move on the board. If it is the best move, the opponent answers automatically and you keep going until the combination is finished. Any other move ends the puzzle.',
  'learn.h2': 'Your rating',
  'learn.p2':
    'Each puzzle has an Elo rating. Solve puzzles above your level and your rating jumps; miss easy ones and you drop. The K-factor starts high so new players settle in quickly.',
  'learn.h3': 'Hints and solutions',
  'learn.p3':
    'Stuck? Take a hint — first the piece, then the square it stands on. You can also reveal the full solution, but that ends the puzzle without rating points.',
  'learn.h4': 'Fair play',
  'learn.p4':
    'Solutions stay on the server and are only streamed to your browser one position at a time, so you cannot inspect the answer in the network tab.',
  'learn.data': 'About the data',
  'learn.dataText':
    'Puzzles come from the Lichess puzzle database, released under CC0. Piece artwork by Colin M.L. Burnett (CC BY-SA 3.0).',
  'learn.cta': 'Start solving',

  'auth.welcome': 'Welcome to Puzzle Arena',
  'auth.welcomeText': 'Your rating, streaks and history — on every device.',
  'auth.login': 'Log in',
  'auth.register': 'Create account',
  'auth.username': 'Username',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.noAccount': 'No account yet?',
  'auth.hasAccount': 'Already registered?',
  'auth.continueGuest': 'Continue as guest',
  'auth.guestHint': 'Guests can play everything; progress lives in this browser profile.',
  'auth.benefits': 'Free forever · No ads · Instant puzzles',

  'common.loading': 'Loading…',
  'common.error': 'Something went wrong',
  'common.retry': 'Try again',
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.of': 'of',
  'common.moves': 'moves',
  'common.you': 'You',
  'common.points': 'pts',
  'common.soon': 'soon',
  'common.new': 'New',
};

export type TKey = keyof typeof en;

const fa: Partial<Record<TKey, string>> = {
  'brand.name': 'پازل آرنا',
  'brand.tagline': 'تاکتیک، هر روز',

  'nav.puzzles': 'معماها',
  'nav.rush': 'سرعت',
  'nav.daily': 'معمای روز',
  'nav.themes': 'موضوع‌ها',
  'nav.learn': 'آموزش',
  'nav.leaderboard': 'جدول برترین‌ها',
  'nav.profile': 'پروفایل',
  'nav.login': 'ورود',
  'nav.signup': 'ثبت‌نام',
  'nav.logout': 'خروج',
  'nav.guest': 'مهمان',

  'home.title': 'تاکتیک‌هایت را تیز کن',
  'home.subtitle': 'هزاران معمای واقعی از بازی‌های رسمی. بهترین حرکت را پیدا کن، امتیازت را بالا ببر و زنجیره‌ات را حفظ کن.',
  'home.start': 'شروع تمرین',
  'home.rush': 'حالت سرعت',
  'home.daily': 'معمای روز',
  'home.statPuzzles': 'معمای گزیده',
  'home.statThemes': 'موضوع تاکتیکی',
  'home.feature1.title': 'سختی هوشمند',
  'home.feature1.text': 'معماها بر اساس ریتینگ تو انتخاب می‌شوند؛ هر معما دقیقاً یک قدم سخت‌تر از سطح فعلی.',
  'home.feature2.title': 'ریتینگ واقعی',
  'home.feature2.text': 'هر معما ریتینگ دارد. حل کنی امتیاز می‌گیری، اشتباه کنی کم می‌شود. نمودار را ببین.',
  'home.feature3.title': 'حالت سرعت',
  'home.feature3.text': 'سه دقیقه، سه جان، یک هدف: بیشترین معمایی که می‌توانی.',
  'home.how': 'چطور کار می‌کند',

  'trainer.yourMove': 'نوبت شماست',
  'trainer.opponentMove': 'حریف در حال پاسخ…',
  'trainer.bestMove': 'بهترین حرکت!',
  'trainer.notQuite': 'نه دقیقاً — این بهترین حرکت نیست',
  'trainer.solved': 'معما حل شد!',
  'trainer.failed': 'معما از دست رفت',
  'trainer.hint': 'راهنمایی',
  'trainer.solution': 'جواب',
  'trainer.retry': 'تلاش دوباره',
  'trainer.skip': 'رد کردن',
  'trainer.next': 'معمای بعدی',
  'trainer.yourRating': 'ریتینگ شما',
  'trainer.puzzleRating': 'ریتینگ معما',
  'trainer.puzzle': 'معما',
  'trainer.theme': 'موضوع',
  'trainer.allThemes': 'همهٔ موضوع‌ها',
  'trainer.difficulty': 'سختی',
  'trainer.adaptive': 'هوشمند',
  'trainer.beginner': 'مبتدی',
  'trainer.easy': 'آسان',
  'trainer.intermediate': 'متوسط',
  'trainer.advanced': 'پیشرفته',
  'trainer.master': 'استاد',
  'trainer.loading': 'در حال آماده‌سازی معما…',
  'trainer.solutionShown': 'جواب نهایی',
  'trainer.todaySolved': 'حل‌شده امروز',
  'trainer.streak': 'زنجیره روزانه',
  'trainer.accuracy': 'دقت',
  'trainer.findBestMove': 'بهترین حرکت را برای {color} پیدا کن',
  'trainer.white': 'سفید',
  'trainer.black': 'سیاه',
  'trainer.promote': 'مهره را انتخاب کن',
  'trainer.check': 'کیش!',
  'trainer.mateHint': 'کیش‌مات در دسترس است',

  'rush.title': 'سرعت معما',
  'rush.subtitle': 'هرچه می‌توانی معما حل کن تا زمان تمام شود. سه اشتباه یعنی پایان.',
  'rush.start': 'شروع',
  'rush.duration': 'مدت',
  'rush.min': 'دقیقه',
  'rush.lives': 'جان',
  'rush.score': 'امتیاز',
  'rush.streak': 'زنجیره',
  'rush.timeUp': 'زمان تمام شد!',
  'rush.outOfLives': 'جان‌ها تمام شد!',
  'rush.finalScore': 'امتیاز نهایی',
  'rush.newBest': 'رکورد شخصی جدید!',
  'rush.playAgain': 'دوباره',
  'rush.rules': 'قوانین',
  'rush.rule1': 'هر معمای حل‌شده یک امتیاز.',
  'rush.rule2': 'هر حرکت اشتباه یک جان و زنجیره را از بین می‌برد.',
  'rush.rule3': 'بازی با پایان زمان یا تمام‌شدن جان‌ها تمام می‌شود.',
  'rush.best': 'رکورد',
  'rush.correctMove': 'حرکت درست این بود',

  'daily.title': 'معمای روز',
  'daily.subtitle': 'هر روز یک معما برای همه. حلش کن تا زنجیره‌ات نشکند.',
  'daily.streak': 'زنجیرهٔ فعلی',
  'daily.done': 'معمای امروز را حل کرده‌ای',
  'daily.missedToday': 'معمای امروز منتظر توست',
  'daily.comeBack': 'معمای بعدی تا',
  'daily.share': 'اشتراک نتیجه',
  'daily.copied': 'در کلیپ‌بورد کپی شد',
  'daily.history': 'دو هفتهٔ گذشته',

  'themes.title': 'تمرین بر اساس موضوع',
  'themes.subtitle': 'یک موتیف را انتخاب کن و آن‌قدر تکرار کن تا ملکهٔ ذهنت شود.',
  'themes.all': 'معماهای ترکیبی',
  'themes.allText': 'کمی از همه‌چیز، متناسب با ریتینگ تو.',
  'themes.puzzles': 'معما',
  'themes.groupMates': 'الگوهای کیش‌مات',
  'themes.groupTactics': 'تاکتیک‌ها',
  'themes.groupEndgame': 'آخر بازی و مراحل',
  'themes.search': 'جستجوی موضوع…',

  'profile.title': 'پروفایل',
  'profile.rating': 'ریتینگ',
  'profile.solved': 'معماهای حل‌شده',
  'profile.attempts': 'کل تلاش‌ها',
  'profile.accuracy': 'دقت',
  'profile.avgTime': 'میانگین زمان',
  'profile.rushBest': 'بهترین سرعت',
  'profile.notPlayed': 'هنوز بازی نشده',
  'profile.ratingHistory': 'تاریخچهٔ ریتینگ',
  'profile.noHistory': 'چند معما حل کن تا نمودارت ساخته شود.',
  'profile.themeAccuracy': 'دقت بر اساس موضوع',
  'profile.recent': 'فعالیت اخیر',
  'profile.noRecent': 'هنوز معمایی حل نکرده‌ای — شروع کن!',
  'profile.memberSince': 'عضو از',
  'profile.guestNote': 'الان به‌عنوان مهمان تمرین می‌کنی. حساب بساز تا پیشرفتت روی همهٔ دستگاه‌ها بماند.',

  'leaderboard.title': 'جدول برترین‌ها',
  'leaderboard.subtitle': 'تیزترین تاکتیک‌بازان آرنا.',
  'leaderboard.rating': 'بر اساس ریتینگ',
  'leaderboard.rush': 'بر اساس امتیاز سرعت',
  'leaderboard.rank': '#',
  'leaderboard.player': 'بازیکن',
  'leaderboard.value': 'ریتینگ',
  'leaderboard.score': 'امتیاز',
  'leaderboard.empty': 'هنوز کسی اینجا نیست — اولین باش.',

  'learn.title': 'پازل آرنا چطور کار می‌کند',
  'learn.intro': 'هر پوزیسیون از یک بازی رسمی و ریتینگ‌شدهٔ لیچس آمده است. حریف همین حالا حرکت کرده — تو باید تنها حرکتی را پیدا کنی که برتری را نگه دارد، مهره ببرد یا مات کند.',
  'learn.h1': 'هر بار یک حرکت',
  'learn.p1': 'حرکتت را روی صفحه انجام بده. اگر بهترین حرکت باشد، حریف خودکار جواب می‌دهد و ادامه می‌دهی تا ترکیب تمام شود. هر حرکت دیگر معما را پایان می‌دهد.',
  'learn.h2': 'ریتینگ تو',
  'learn.p2': 'هر معما یک ریتینگ Elo دارد. معمای بالاتر از سطحت را حل کنی، ریتینگت می‌جهد؛ معمای آسان را از دست بدهی، کم می‌شود. ضریب K در ابتدا بزرگ‌تر است تا سریع جای خودت را پیدا کنی.',
  'learn.h3': 'راهنمایی و جواب',
  'learn.p3': 'گیر کرده‌ای؟ راهنمایی بگیر — اول مهره، بعد خانه‌ای که رویش ایستاده. می‌توانی جواب کامل را هم ببینی، اما آن معما بدون امتیاز تمام می‌شود.',
  'learn.h4': 'بازی جوانمردانه',
  'learn.p4': 'جواب‌ها روی سرور می‌مانند و فقط پله‌به‌پله به مرورگر می‌رسند؛ پس نمی‌توانی در تب Network جواب را پیدا کنی.',
  'learn.data': 'دربارهٔ داده‌ها',
  'learn.dataText': 'معماها از دیتابیس معمای لیچس با مجوز CC0 گرفته شده‌اند. طرح مهره‌ها از Colin M.L. Burnett (CC BY-SA 3.0) است.',
  'learn.cta': 'شروع حل',

  'auth.welcome': 'به پازل آرنا خوش آمدی',
  'auth.welcomeText': 'ریتینگ، زنجیره‌ها و تاریخچه‌ات — روی همهٔ دستگاه‌ها.',
  'auth.login': 'ورود',
  'auth.register': 'ساخت حساب',
  'auth.username': 'نام کاربری',
  'auth.email': 'ایمیل',
  'auth.password': 'رمز عبور',
  'auth.noAccount': 'حساب نداری؟',
  'auth.hasAccount': 'قبلاً ثبت‌نام کرده‌ای؟',
  'auth.continueGuest': 'ادامه به‌عنوان مهمان',
  'auth.guestHint': 'مهمان‌ها همه‌چیز را بازی می‌کنند؛ پیشرفت در همین مرورگر می‌ماند.',
  'auth.benefits': 'همیشه رایگان · بدون تبلیغ · معماهای بی‌پایان',

  'common.loading': 'در حال بارگذاری…',
  'common.error': 'مشکلی پیش آمد',
  'common.retry': 'تلاش دوباره',
  'common.close': 'بستن',
  'common.cancel': 'انصراف',
  'common.of': 'از',
  'common.moves': 'حرکت',
  'common.you': 'شما',
  'common.points': 'امتیاز',
  'common.soon': 'به‌زودی',
  'common.new': 'جدید',
};

const dictionaries: Record<Lang, Partial<Record<TKey, string>>> = { en, fa };

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nValue | null>(null);
const LANG_KEY = 'puzzle-arena.lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY) as Lang | null;
      if (stored === 'en' || stored === 'fa') return stored;
      return navigator.language?.startsWith('fa') ? 'fa' : 'en';
    } catch {
      return 'en';
    }
  });

  const dir: 'ltr' | 'rtl' = lang === 'fa' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggleLang = useCallback(() => setLangState((l) => (l === 'en' ? 'fa' : 'en')), []);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => {
      let str = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, String(v));
      return str;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, toggleLang, t, dir }), [lang, setLang, toggleLang, t, dir]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
