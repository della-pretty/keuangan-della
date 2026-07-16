"""
Catatan Keuangan Mahasiswa
Aplikasi pencatatan keuangan pribadi dengan kategorisasi otomatis
menggunakan Naive Bayes (scikit-learn).

Cara jalanin (mode desktop, buat development/testing):
    python main.py

Kontrol UI:
    - Tombol "+ Tambah Transaksi" buat nambah data
    - Ketik deskripsi lalu tombol "Prediksi Kategori" buat auto-deteksi kategori
    - Tombol "Laporan" buat lihat ringkasan pengeluaran per kategori
"""

import database
from classifier import ExpenseCategorizer, CATEGORIES

from kivy.app import App
from kivy.uix.screenmanager import ScreenManager, Screen, SlideTransition
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.textinput import TextInput
from kivy.uix.spinner import Spinner
from kivy.uix.scrollview import ScrollView
from kivy.uix.popup import Popup
from kivy.uix.widget import Widget
from kivy.graphics import Color, Rectangle
from kivy.metrics import dp
from kivy.core.window import Window

# Warna tema (Pink)
COLOR_BG = (1.0, 0.94, 0.96, 1)
COLOR_PRIMARY = (0.93, 0.35, 0.55, 1)
COLOR_INCOME = (0.2, 0.6, 0.35, 1)
COLOR_EXPENSE = (0.85, 0.25, 0.25, 1)
COLOR_CARD = (1, 1, 1, 1)

CATEGORY_COLORS = {
    "Makanan": (0.95, 0.55, 0.65, 1),
    "Transportasi": (0.85, 0.4, 0.6, 1),
    "Pendidikan": (0.75, 0.35, 0.65, 1),
    "Hiburan": (0.95, 0.3, 0.55, 1),
    "Belanja": (0.9, 0.5, 0.7, 1),
    "Kesehatan": (0.8, 0.45, 0.75, 1),
    "Pemasukan": (0.2, 0.6, 0.35, 1),
    "Lainnya": (0.7, 0.55, 0.6, 1),
}


def format_rupiah(value):
    return f"Rp {value:,.0f}".replace(",", ".")


def show_message(title, message):
    popup = Popup(
        title=title,
        content=Label(text=message),
        size_hint=(0.8, 0.4),
    )
    popup.open()


class TransactionRow(BoxLayout):
    def __init__(self, transaksi, **kwargs):
        super().__init__(orientation="horizontal", size_hint_y=None, height=dp(60),
                          padding=dp(8), spacing=dp(8), **kwargs)
        with self.canvas.before:
            Color(1, 1, 1, 1)
            self.bg = Rectangle(pos=self.pos, size=self.size)
        self.bind(pos=self._update_bg, size=self._update_bg)

        info = BoxLayout(orientation="vertical")
        info.add_widget(Label(text=transaksi["deskripsi"], color=(0.1, 0.1, 0.1, 1),
                               halign="left", valign="middle", font_size="14sp",
                               text_size=(dp(180), None)))
        info.add_widget(Label(text=f"{transaksi['kategori']} | {transaksi['tanggal']}",
                               color=(0.5, 0.5, 0.5, 1), halign="left", valign="middle",
                               font_size="11sp", text_size=(dp(180), None)))
        self.add_widget(info)

        sign = "+" if transaksi["tipe"] == "Pemasukan" else "-"
        color = COLOR_INCOME if transaksi["tipe"] == "Pemasukan" else COLOR_EXPENSE
        nominal_label = Label(
            text=f"{sign}{format_rupiah(transaksi['nominal'])}",
            color=color, bold=True, font_size="14sp", size_hint_x=0.4,
        )
        self.add_widget(nominal_label)

    def _update_bg(self, *args):
        self.bg.pos = self.pos
        self.bg.size = self.size


class BarChart(Widget):
    """Widget sederhana buat gambar bar chart pakai Kivy canvas."""

    def __init__(self, data, **kwargs):
        # data: list of (label, value)
        super().__init__(**kwargs)
        self.data = data
        self.bind(pos=self.redraw, size=self.redraw)

    def redraw(self, *args):
        self.canvas.clear()
        if not self.data:
            return
        max_val = max(v for _, v in self.data) or 1
        n = len(self.data)
        bar_width = self.width / n * 0.6
        gap = self.width / n

        with self.canvas:
            for i, (label, value) in enumerate(self.data):
                bar_height = (value / max_val) * (self.height - dp(40))
                x = self.x + i * gap + (gap - bar_width) / 2
                y = self.y
                color = CATEGORY_COLORS.get(label, (0.4, 0.4, 0.4, 1))
                Color(*color)
                Rectangle(pos=(x, y), size=(bar_width, bar_height))


class HomeScreen(Screen):
    def __init__(self, categorizer, **kwargs):
        super().__init__(**kwargs)
        self.categorizer = categorizer
        self.build_ui()

    def build_ui(self):
        root = BoxLayout(orientation="vertical")
        with root.canvas.before:
            Color(*COLOR_BG)
            self.bg_rect = Rectangle(pos=root.pos, size=root.size)
        root.bind(pos=self._update_bg, size=self._update_bg)

        # Header / kartu saldo
        self.header = BoxLayout(orientation="vertical", size_hint_y=None, height=dp(120),
                                 padding=dp(16))
        with self.header.canvas.before:
            Color(*COLOR_PRIMARY)
            self.header_bg = Rectangle(pos=self.header.pos, size=self.header.size)
        self.header.bind(pos=self._update_header_bg, size=self._update_header_bg)

        self.saldo_label = Label(text="Rp 0", font_size="28sp", bold=True, color=(1, 1, 1, 1))
        self.detail_label = Label(text="Pemasukan: Rp 0   |   Pengeluaran: Rp 0",
                                   font_size="13sp", color=(1, 1, 1, 1))
        self.header.add_widget(Label(text="Total Saldo", font_size="13sp", color=(1, 1, 1, 0.85)))
        self.header.add_widget(self.saldo_label)
        self.header.add_widget(self.detail_label)
        root.add_widget(self.header)

        # List transaksi
        self.list_layout = BoxLayout(orientation="vertical", size_hint_y=None, spacing=dp(4),
                                      padding=dp(8))
        self.list_layout.bind(minimum_height=self.list_layout.setter("height"))
        scroll = ScrollView()
        scroll.add_widget(self.list_layout)
        root.add_widget(scroll)

        # Tombol bawah
        button_bar = BoxLayout(orientation="horizontal", size_hint_y=None, height=dp(56),
                                spacing=dp(4), padding=dp(4))
        btn_add = Button(text="+ Tambah Transaksi", background_color=COLOR_PRIMARY)
        btn_add.bind(on_release=lambda x: self.go_to_add())
        btn_report = Button(text="Laporan", background_color=(0.3, 0.3, 0.3, 1))
        btn_report.bind(on_release=lambda x: self.go_to_report())
        button_bar.add_widget(btn_add)
        button_bar.add_widget(btn_report)
        root.add_widget(button_bar)

        self.add_widget(root)

    def _update_bg(self, instance, *args):
        self.bg_rect.pos = instance.pos
        self.bg_rect.size = instance.size

    def _update_header_bg(self, instance, *args):
        self.header_bg.pos = instance.pos
        self.header_bg.size = instance.size

    def on_pre_enter(self):
        self.refresh()

    def refresh(self):
        income, expense, balance = database.get_balance()
        self.saldo_label.text = format_rupiah(balance)
        self.detail_label.text = (
            f"Pemasukan: {format_rupiah(income)}   |   Pengeluaran: {format_rupiah(expense)}"
        )

        self.list_layout.clear_widgets()
        transactions = database.get_all_transactions(limit=50)
        if not transactions:
            self.list_layout.add_widget(
                Label(text="Belum ada transaksi. Yuk tambah dulu!", size_hint_y=None, height=dp(50),
                      color=(0.5, 0.5, 0.5, 1))
            )
        for t in transactions:
            self.list_layout.add_widget(TransactionRow(t))

    def go_to_add(self):
        self.manager.transition = SlideTransition(direction="left")
        self.manager.current = "add"

    def go_to_report(self):
        self.manager.transition = SlideTransition(direction="left")
        self.manager.current = "report"


class AddScreen(Screen):
    def __init__(self, categorizer, **kwargs):
        super().__init__(**kwargs)
        self.categorizer = categorizer
        self.build_ui()

    def build_ui(self):
        root = BoxLayout(orientation="vertical", padding=dp(16), spacing=dp(10))
        with root.canvas.before:
            Color(*COLOR_BG)
            self.bg_rect = Rectangle(pos=root.pos, size=root.size)
        root.bind(pos=self._update_bg, size=self._update_bg)

        root.add_widget(Label(text="Tambah Transaksi", font_size="20sp", bold=True,
                               color=(0.1, 0.1, 0.1, 1), size_hint_y=None, height=dp(40)))

        root.add_widget(Label(text="Deskripsi", size_hint_y=None, height=dp(20),
                               color=(0.3, 0.3, 0.3, 1), halign="left"))
        self.deskripsi_input = TextInput(hint_text="contoh: makan siang di warteg",
                                          size_hint_y=None, height=dp(44), multiline=False)
        root.add_widget(self.deskripsi_input)

        root.add_widget(Label(text="Nominal (Rp)", size_hint_y=None, height=dp(20),
                               color=(0.3, 0.3, 0.3, 1)))
        self.nominal_input = TextInput(hint_text="contoh: 25000", size_hint_y=None,
                                        height=dp(44), multiline=False, input_filter="float")
        root.add_widget(self.nominal_input)

        root.add_widget(Label(text="Tipe", size_hint_y=None, height=dp(20),
                               color=(0.3, 0.3, 0.3, 1)))
        self.tipe_spinner = Spinner(text="Pengeluaran", values=["Pengeluaran", "Pemasukan"],
                                     size_hint_y=None, height=dp(44))
        root.add_widget(self.tipe_spinner)

        predict_row = BoxLayout(orientation="horizontal", size_hint_y=None, height=dp(44),
                                 spacing=dp(8))
        btn_predict = Button(text="🔮 Prediksi Kategori (AI)", background_color=(0.8, 0.45, 0.65, 1))
        btn_predict.bind(on_release=lambda x: self.predict_category())
        predict_row.add_widget(btn_predict)
        root.add_widget(predict_row)

        root.add_widget(Label(text="Kategori", size_hint_y=None, height=dp(20),
                               color=(0.3, 0.3, 0.3, 1)))
        self.kategori_spinner = Spinner(text="Lainnya", values=CATEGORIES,
                                         size_hint_y=None, height=dp(44))
        root.add_widget(self.kategori_spinner)

        self.confidence_label = Label(text="", size_hint_y=None, height=dp(24),
                                       color=(0.4, 0.4, 0.4, 1), font_size="12sp")
        root.add_widget(self.confidence_label)

        root.add_widget(Widget())  # spacer

        button_bar = BoxLayout(orientation="horizontal", size_hint_y=None, height=dp(50),
                                spacing=dp(8))
        btn_cancel = Button(text="Batal", background_color=(0.7, 0.7, 0.7, 1))
        btn_cancel.bind(on_release=lambda x: self.go_back())
        btn_save = Button(text="Simpan", background_color=COLOR_PRIMARY)
        btn_save.bind(on_release=lambda x: self.save_transaction())
        button_bar.add_widget(btn_cancel)
        button_bar.add_widget(btn_save)
        root.add_widget(button_bar)

        self.add_widget(root)

    def _update_bg(self, instance, *args):
        self.bg_rect.pos = instance.pos
        self.bg_rect.size = instance.size

    def predict_category(self):
        desc = self.deskripsi_input.text.strip()
        if not desc:
            show_message("Info", "Isi deskripsi dulu ya, biar bisa diprediksi kategorinya.")
            return
        predicted = self.categorizer.predict(desc)
        self.kategori_spinner.text = predicted

        probs = self.categorizer.predict_proba(desc)
        top = list(probs.items())[0] if probs else (predicted, 0)
        self.confidence_label.text = f"Prediksi AI: {top[0]} (keyakinan {top[1]*100:.0f}%)"

    def save_transaction(self):
        desc = self.deskripsi_input.text.strip()
        nominal_text = self.nominal_input.text.strip()

        if not desc:
            show_message("Error", "Deskripsi tidak boleh kosong.")
            return
        if not nominal_text:
            show_message("Error", "Nominal tidak boleh kosong.")
            return
        try:
            nominal = float(nominal_text)
            if nominal <= 0:
                raise ValueError
        except ValueError:
            show_message("Error", "Nominal harus berupa angka lebih dari 0.")
            return

        tipe = self.tipe_spinner.text
        kategori = self.kategori_spinner.text if kategori_valid(self.kategori_spinner.text) else "Lainnya"
        if tipe == "Pemasukan":
            kategori = "Pemasukan"

        database.add_transaction(desc, kategori, tipe, nominal)

        # reset form
        self.deskripsi_input.text = ""
        self.nominal_input.text = ""
        self.confidence_label.text = ""
        self.kategori_spinner.text = "Lainnya"

        self.go_back()

    def go_back(self):
        self.manager.transition = SlideTransition(direction="right")
        self.manager.current = "home"


def kategori_valid(value):
    return value in CATEGORIES


class ReportScreen(Screen):
    def build_ui(self):
        root = BoxLayout(orientation="vertical", padding=dp(16), spacing=dp(10))
        with root.canvas.before:
            Color(*COLOR_BG)
            self.bg_rect = Rectangle(pos=root.pos, size=root.size)
        root.bind(pos=self._update_bg, size=self._update_bg)

        root.add_widget(Label(text="Laporan Pengeluaran per Kategori", font_size="18sp", bold=True,
                               color=(0.1, 0.1, 0.1, 1), size_hint_y=None, height=dp(40)))

        self.chart_container = BoxLayout(orientation="vertical")
        root.add_widget(self.chart_container)

        self.legend_layout = GridLayout(cols=2, size_hint_y=None, spacing=dp(4))
        self.legend_layout.bind(minimum_height=self.legend_layout.setter("height"))
        legend_scroll = ScrollView(size_hint_y=0.35)
        legend_scroll.add_widget(self.legend_layout)
        root.add_widget(legend_scroll)

        btn_back = Button(text="Kembali", size_hint_y=None, height=dp(50),
                           background_color=(0.3, 0.3, 0.3, 1))
        btn_back.bind(on_release=lambda x: self.go_back())
        root.add_widget(btn_back)

        self.add_widget(root)

    def _update_bg(self, instance, *args):
        self.bg_rect.pos = instance.pos
        self.bg_rect.size = instance.size

    def on_pre_enter(self):
        self.chart_container.clear_widgets()
        self.legend_layout.clear_widgets()

        summary = database.get_category_summary()
        if not summary:
            self.chart_container.add_widget(
                Label(text="Belum ada data pengeluaran.", color=(0.5, 0.5, 0.5, 1))
            )
            return

        chart = BarChart(data=summary, size_hint_y=1)
        self.chart_container.add_widget(chart)

        total = sum(v for _, v in summary)
        for label, value in summary:
            color = CATEGORY_COLORS.get(label, (0.4, 0.4, 0.4, 1))
            pct = (value / total * 100) if total else 0
            swatch_label = Label(
                text=f"[color={self._hex(color)}]■[/color] {label}: {format_rupiah(value)} ({pct:.0f}%)",
                markup=True, size_hint_y=None, height=dp(28), color=(0.2, 0.2, 0.2, 1),
                halign="left", text_size=(dp(300), None),
            )
            self.legend_layout.add_widget(swatch_label)

    def _hex(self, color):
        r, g, b = [int(c * 255) for c in color[:3]]
        return f"{r:02x}{g:02x}{b:02x}"

    def go_back(self):
        self.manager.transition = SlideTransition(direction="right")
        self.manager.current = "home"


class OnboardingScreen(Screen):
    """Ditampilkan sekali di awal: isi profil (nama, email, TTL) + bikin PIN."""

    def build_ui(self):
        root = BoxLayout(orientation="vertical", padding=dp(20), spacing=dp(8))
        with root.canvas.before:
            Color(*COLOR_BG)
            self.bg_rect = Rectangle(pos=root.pos, size=root.size)
        root.bind(pos=self._update_bg, size=self._update_bg)

        scroll = ScrollView()
        form = BoxLayout(orientation="vertical", spacing=dp(8), size_hint_y=None, padding=dp(4))
        form.bind(minimum_height=form.setter("height"))

        form.add_widget(Label(text="Selamat Datang!", font_size="22sp", bold=True,
                               color=(0.2, 0.2, 0.2, 1), size_hint_y=None, height=dp(36)))
        form.add_widget(Label(text="Isi data diri kamu dulu ya sebelum mulai.",
                               font_size="13sp", color=(0.5, 0.5, 0.5, 1),
                               size_hint_y=None, height=dp(24)))

        form.add_widget(Label(text="Nama Lengkap", size_hint_y=None, height=dp(20),
                               color=(0.3, 0.3, 0.3, 1)))
        self.nama_input = TextInput(hint_text="contoh: Aptrilia Nadiella", size_hint_y=None,
                                     height=dp(44), multiline=False)
        form.add_widget(self.nama_input)

        form.add_widget(Label(text="Email", size_hint_y=None, height=dp(20),
                               color=(0.3, 0.3, 0.3, 1)))
        self.email_input = TextInput(hint_text="contoh: nama@email.com", size_hint_y=None,
                                      height=dp(44), multiline=False)
        form.add_widget(self.email_input)

        form.add_widget(Label(text="Tanggal Lahir", size_hint_y=None, height=dp(20),
                               color=(0.3, 0.3, 0.3, 1)))
        self.ttl_input = TextInput(hint_text="format: DD-MM-YYYY, contoh: 17-08-2004",
                                    size_hint_y=None, height=dp(44), multiline=False)
        form.add_widget(self.ttl_input)

        form.add_widget(Label(text="Buat PIN (4-6 digit angka)", size_hint_y=None, height=dp(20),
                               color=(0.3, 0.3, 0.3, 1)))
        self.pin_input = TextInput(hint_text="contoh: 1234", size_hint_y=None, height=dp(44),
                                    multiline=False, password=True, input_filter="int")
        form.add_widget(self.pin_input)

        form.add_widget(Label(text="Konfirmasi PIN", size_hint_y=None, height=dp(20),
                               color=(0.3, 0.3, 0.3, 1)))
        self.pin_confirm_input = TextInput(hint_text="ulangi PIN", size_hint_y=None,
                                            height=dp(44), multiline=False, password=True,
                                            input_filter="int")
        form.add_widget(self.pin_confirm_input)

        self.error_label = Label(text="", color=COLOR_EXPENSE, size_hint_y=None, height=dp(30),
                                  font_size="12sp")
        form.add_widget(self.error_label)

        btn_save = Button(text="Simpan & Mulai", background_color=COLOR_PRIMARY,
                           size_hint_y=None, height=dp(50))
        btn_save.bind(on_release=lambda x: self.submit())
        form.add_widget(btn_save)

        scroll.add_widget(form)
        root.add_widget(scroll)
        self.add_widget(root)

    def _update_bg(self, instance, *args):
        self.bg_rect.pos = instance.pos
        self.bg_rect.size = instance.size

    def submit(self):
        nama = self.nama_input.text.strip()
        email = self.email_input.text.strip()
        ttl = self.ttl_input.text.strip()
        pin = self.pin_input.text.strip()
        pin_confirm = self.pin_confirm_input.text.strip()

        if not nama or not email or not ttl:
            self.error_label.text = "Semua data diri wajib diisi."
            return
        if "@" not in email or "." not in email:
            self.error_label.text = "Format email tidak valid."
            return
        if not (4 <= len(pin) <= 6):
            self.error_label.text = "PIN harus 4-6 digit angka."
            return
        if pin != pin_confirm:
            self.error_label.text = "Konfirmasi PIN tidak cocok."
            return

        database.save_profile(nama, email, ttl, pin)
        self.error_label.text = ""

        self.manager.transition = SlideTransition(direction="left")
        self.manager.current = "home"


class PinLockScreen(Screen):
    """Ditampilkan tiap kali aplikasi dibuka (setelah user pernah registrasi)."""

    def build_ui(self):
        root = BoxLayout(orientation="vertical", padding=dp(24), spacing=dp(12))
        with root.canvas.before:
            Color(*COLOR_PRIMARY)
            self.bg_rect = Rectangle(pos=root.pos, size=root.size)
        root.bind(pos=self._update_bg, size=self._update_bg)

        root.add_widget(Widget(size_hint_y=0.15))

        self.greeting_label = Label(text="Selamat Datang", font_size="20sp", bold=True,
                                     color=(1, 1, 1, 1), size_hint_y=None, height=dp(36))
        root.add_widget(self.greeting_label)

        root.add_widget(Label(text="Masukkan PIN buat masuk", font_size="13sp",
                               color=(1, 1, 1, 0.85), size_hint_y=None, height=dp(24)))

        self.pin_input = TextInput(hint_text="PIN", password=True, input_filter="int",
                                    multiline=False, size_hint_y=None, height=dp(48),
                                    font_size="20sp", halign="center",
                                    size_hint_x=None, width=dp(200),
                                    pos_hint={"center_x": 0.5})
        pin_wrap = BoxLayout(size_hint_y=None, height=dp(48))
        pin_wrap.add_widget(Widget())
        pin_wrap.add_widget(self.pin_input)
        pin_wrap.add_widget(Widget())
        root.add_widget(pin_wrap)

        self.error_label = Label(text="", color=(1, 0.85, 0.85, 1), size_hint_y=None,
                                  height=dp(24), font_size="12sp")
        root.add_widget(self.error_label)

        btn_unlock = Button(text="Masuk", background_color=(1, 1, 1, 1), color=(0.1, 0.1, 0.1, 1),
                             size_hint_y=None, height=dp(48), size_hint_x=None, width=dp(200),
                             pos_hint={"center_x": 0.5})
        btn_unlock.bind(on_release=lambda x: self.check_pin())
        unlock_wrap = BoxLayout(size_hint_y=None, height=dp(48))
        unlock_wrap.add_widget(Widget())
        unlock_wrap.add_widget(btn_unlock)
        unlock_wrap.add_widget(Widget())
        root.add_widget(unlock_wrap)

        root.add_widget(Widget())

        btn_reset = Button(text="Lupa PIN? (Reset Aplikasi)",
                           background_normal="", background_down="",
                           background_color=(0, 0, 0, 0), color=(1, 1, 1, 0.9),
                           size_hint_y=None, height=dp(30), font_size="12sp")
        btn_reset.bind(on_release=lambda x: self.confirm_reset())
        root.add_widget(btn_reset)

        self.add_widget(root)

    def _update_bg(self, instance, *args):
        self.bg_rect.pos = instance.pos
        self.bg_rect.size = instance.size

    def on_pre_enter(self):
        profile = database.get_profile()
        if profile:
            self.greeting_label.text = f"Halo, {profile['nama'].split(' ')[0]}!"
        self.pin_input.text = ""
        self.error_label.text = ""

    def check_pin(self):
        pin = self.pin_input.text.strip()
        if database.verify_pin(pin):
            self.error_label.text = ""
            self.manager.transition = SlideTransition(direction="left")
            self.manager.current = "home"
        else:
            self.error_label.text = "PIN salah, coba lagi."
            self.pin_input.text = ""

    def confirm_reset(self):
        content = BoxLayout(orientation="vertical", spacing=dp(10), padding=dp(10))
        content.add_widget(Label(
            text="Semua data (profil & transaksi) akan dihapus.\nYakin mau reset?",
            halign="center"))
        btn_row = BoxLayout(size_hint_y=None, height=dp(44), spacing=dp(8))

        popup = Popup(title="Reset Aplikasi", content=content, size_hint=(0.8, 0.4))

        btn_yes = Button(text="Ya, Reset")
        btn_no = Button(text="Batal")
        btn_row.add_widget(btn_no)
        btn_row.add_widget(btn_yes)
        content.add_widget(btn_row)

        def do_reset(instance):
            database.reset_all_data()
            popup.dismiss()
            self.manager.transition = SlideTransition(direction="right")
            self.manager.current = "onboarding"

        btn_yes.bind(on_release=do_reset)
        btn_no.bind(on_release=lambda x: popup.dismiss())
        popup.open()


class KeuanganApp(App):
    def build(self):
        self.title = "Catatan Keuangan Mahasiswa"
        Window.clearcolor = COLOR_BG

        database.init_db()
        categorizer = ExpenseCategorizer()

        sm = ScreenManager()

        onboarding_screen = OnboardingScreen(name="onboarding")
        onboarding_screen.build_ui()
        sm.add_widget(onboarding_screen)

        pinlock_screen = PinLockScreen(name="pinlock")
        pinlock_screen.build_ui()
        sm.add_widget(pinlock_screen)

        sm.add_widget(HomeScreen(categorizer, name="home"))
        sm.add_widget(AddScreen(categorizer, name="add"))
        report_screen = ReportScreen(name="report")
        report_screen.build_ui()
        sm.add_widget(report_screen)

        sm.current = "pinlock" if database.is_registered() else "onboarding"

        return sm


if __name__ == "__main__":
    KeuanganApp().run()
