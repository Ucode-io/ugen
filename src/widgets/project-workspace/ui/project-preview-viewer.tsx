import { ArrowRight, Code2, Cpu, Globe2, Layout, Mail, MapPin, Phone, Rocket } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useVisualEditorStore } from "@/entities/visual-editor"
import { MoveablePrompt } from "./moveable-prompt"

export const ProjectPreviewViewer = () => {
  const { isInspectMode, addSelectedElement } = useVisualEditorStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null)
  const [outlineRect, setOutlineRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null)

  // Floating Prompt States
  const [isPromptVisible, setIsPromptVisible] = useState(false)
  const [promptPosition, setPromptPosition] = useState({ x: 0, y: 0 })


  useEffect(() => {
    if (!isInspectMode) {
      setHoveredElement(null)
      setOutlineRect(null)
      return
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Don't inspect the overlay itself, the container, or ignore-inspect elements
      if (target === containerRef.current || target.closest('.inspect-overlay') || target.closest('.ignore-inspect')) return

      setHoveredElement(target)
      const rect = target.getBoundingClientRect()
      const containerRect = containerRef.current?.getBoundingClientRect()

      if (containerRect) {
        setOutlineRect({
          top: rect.top - containerRect.top + containerRef.current!.scrollTop,
          left: rect.left - containerRect.left,
          width: rect.width,
          height: rect.height
        })
      }
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.ignore-inspect') || target.closest('.inspect-overlay')) return

      e.preventDefault()
      e.stopPropagation()

      if (hoveredElement) {
        const classList = hoveredElement.getAttribute('class') || ''
        const rect = hoveredElement.getBoundingClientRect()
        const containerRect = containerRef.current?.getBoundingClientRect()

        addSelectedElement({
          id: Math.random().toString(36).substr(2, 9),
          tagName: hoveredElement?.tagName,
          className: classList.split(' ').slice(0, 3).join(' '),
          text: hoveredElement?.innerText?.slice(0, 30)?.trim()
        })

        // Position prompt bar below element
        if (containerRect) {
          setIsPromptVisible(true)
          setPromptPosition({
            x: rect.left - containerRect.left + (rect.width / 2) - 300, // centered (assuming 600px width)
            y: rect.top - containerRect.top + containerRef.current!.scrollTop + rect.height + 20
          })
        }
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('mouseover', handleMouseOver)
      container.addEventListener('click', handleClick, true)
    }

    return () => {
      if (container) {
        container.removeEventListener('mouseover', handleMouseOver)
        container.removeEventListener('click', handleClick, true)
      }
    }
  }, [isInspectMode, hoveredElement, addSelectedElement])

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto bg-white text-slate-900 scroll-smooth h-full relative ${isInspectMode ? 'cursor-crosshair' : ''}`}
    >
      {isInspectMode && outlineRect && (
        <div
          className="inspect-overlay pointer-events-none absolute z-[100] border-2 border-primary bg-primary/10 transition-[top,left,width,height] duration-75"
          style={{
            top: outlineRect.top,
            left: outlineRect.left,
            width: outlineRect.width,
            height: outlineRect.height
          }}
        >
          <div className="absolute -top-6 left-0 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
            {hoveredElement?.tagName.toLowerCase()} {hoveredElement?.getAttribute('class') ? `.${hoveredElement.getAttribute('class')?.split(' ')?.slice(0, 3).join(' ')}` : ''}
          </div>
        </div>
      )}

      {/* Floating Prompt Bar */}
      <MoveablePrompt
        isVisible={isPromptVisible && isInspectMode}
        initialPosition={promptPosition}
        containerRef={containerRef}
        onClose={() => setIsPromptVisible(false)}
      />



      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="bg-primary w-8 h-8 rounded-lg flex items-center justify-center">
            <Rocket className="text-white" size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Udevs
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#services" className="hover:text-primary transition-colors">Services</a>
          <a href="#about" className="hover:text-primary transition-colors">About</a>
          <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
        </div>
        <button className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-all hover:shadow-lg">
          Get Started
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative px-8 py-24 lg:py-32 flex flex-col items-center text-center max-w-5xl mx-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-primary/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-blue-400/20 rounded-full blur-[100px]" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-bold mb-6 uppercase tracking-wider">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Next-Gen IT Solutions
        </div>

        <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-8 tracking-tight">
          We Build <span className="text-primary italic">Digital</span> Experiences That Scale
        </h1>

        <p className="text-lg text-slate-600 mb-10 max-w-2xl leading-relaxed">
          Udevs specializes in high-performance software engineering, cloud infrastructure,
          and AI integration. We transform complex problems into seamless digital solutions.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button className="bg-primary text-white px-8 py-4 rounded-xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-xl shadow-primary/20">
            Start Your Project <ArrowRight size={18} />
          </button>
          <button className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-semibold hover:bg-slate-50 transition-all">
            View Portfolio
          </button>
        </div>
      </section>

      {/* Services Grid (Part of About/Services) */}
      <section id="services" className="px-8 py-20 bg-slate-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Expertise</h2>
            <p className="text-slate-500 max-w-xl">From initial concept to full-scale production, we cover every aspect of the software development lifecycle.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Code2 size={24} />, title: "Custom Software", desc: "Tailored enterprise solutions built with modern technology stacks." },
              { icon: <Globe2 size={24} />, title: "Web Platforms", desc: "Responsive, high-conversion websites and complex web applications." },
              { icon: <Layout size={24} />, title: "UI/UX Design", desc: "User-centric designs that prioritize accessibility and brand identity." },
              { icon: <Cpu size={24} />, title: "AI Integrity", desc: "Specialized AI models and automation workflows for modern businesses." },
              { icon: <Rocket size={24} />, title: "Cloud Strategy", desc: "Secure, scalable cloud infrastructure and DevOps management." },
              { icon: <Mail size={24} />, title: "Support 24/7", desc: "Ongoing maintenance and dedicated technical support for all products." }
            ].map((s, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                  {s.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="px-8 py-24 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="aspect-square bg-slate-100 rounded-3xl overflow-hidden shadow-2xl">
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                <Rocket size={120} className="text-primary opacity-20" />
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-50 hidden md:block">
              <div className="text-4xl font-black text-primary mb-1">10+</div>
              <div className="text-xs uppercase font-bold tracking-widest text-slate-400">Years Experience</div>
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-6 tracking-tight">Driving Innovation Through Code</h2>
            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
              At Udevs, we believe that great software isn't just about code—it's about solving real-world challenges
              and creating value for people. Since our inception, we've helped hundreds of startups
              and established corporations redefine their digital presence.
            </p>
            <ul className="space-y-4 mb-8">
              {["Agile Development Methodology", "Zero-Tolerance for Buggy Code", "Performance-First Approach"].map((t, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                  <div className="w-5 h-5 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
                    <ArrowRight size={12} strokeWidth={4} />
                  </div>
                  {t}
                </li>
              ))}
            </ul>
            <button className="text-primary font-bold inline-flex items-center gap-2 hover:gap-3 transition-all">
              Learn more about our team <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 pt-20 pb-10 px-8 text-slate-400">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-12 mb-20">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Rocket className="text-primary" size={24} />
                <span className="text-2xl font-bold text-white">Udevs</span>
              </div>
              <p className="max-w-xs mb-8">
                Building the future of IT services with precision and passion.
                Based in Tashkent, working globally.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
                  <Globe2 size={18} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Quick Links</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Career</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Contact Us</h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-primary shrink-0" />
                  <span>Tashkent, Uzbekistan</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-primary shrink-0" />
                  <span>hello@udevs.io</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-primary shrink-0" />
                  <span>+998 (90) 123 45 67</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>© 2026 Udevs. All rights reserved.</p>
            <p>Built with Passion for Digital Excellence</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
