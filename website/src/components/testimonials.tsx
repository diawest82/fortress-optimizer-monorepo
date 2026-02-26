export default function Testimonials() {
  const testimonials = [
    {
      quote: "Fortress reduced our API costs by 18% within the first month. The token savings are real.",
      author: "Sarah Chen",
      role: "CTO, TechStart AI",
      company: "TechStart AI",
    },
    {
      quote: "Our Claude API spend dropped significantly. Fortress is a no-brainer for any team using LLMs.",
      author: "Marcus Rodriguez",
      role: "Engineering Lead, DataFlow",
      company: "DataFlow",
    },
    {
      quote: "We integrated it into our Slack workspace. The real-time optimization is impressive—hardly noticeable latency.",
      author: "Elena Volkova",
      role: "Product Manager, CloudSync",
      company: "CloudSync",
    },
  ];

  return (
    <section className="space-y-12">
      <div className="text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-cyan-400 font-semibold">
          Trusted by teams
        </p>
        <h2 className="text-3xl font-semibold text-white md:text-4xl">
          See what builders are saying
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Teams across the industry are saving tokens and reducing latency with Fortress.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.author}
            className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-950/60 to-slate-900/40 p-6 hover:border-cyan-500/40 transition-colors duration-300"
          >
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-amber-400">
                  ★
                </span>
              ))}
            </div>
            <p className="text-slate-300 mb-6 italic leading-relaxed">
              &ldquo;{testimonial.quote}&rdquo;
            </p>
            <div>
              <p className="font-semibold text-white">{testimonial.author}</p>
              <p className="text-xs text-slate-400">{testimonial.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
