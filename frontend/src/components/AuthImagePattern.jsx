const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="flex items-center justify-center bg-base-200 p-12 relative overflow-hidden h-full">
      {/* Geometric floating shapes */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-16 h-16 bg-primary/20 rounded-full blur-md opacity-60 animate-float-slow`}
            style={{
              top: `${Math.random() * 90}%`,
              left: `${Math.random() * 90}%`,
              animationDelay: `${i * 0.4}s`,
              borderRadius: i % 3 === 0 ? "0%" : i % 3 === 1 ? "50%" : "20%",
              transform: `rotate(${i * 30}deg)`,
            }}
          />
        ))}
      </div>

      {/* Foreground Text */}
      <div className="relative z-10 bg-white/5 backdrop-blur-md rounded-xl p-10 text-center max-w-md shadow-xl border border-white/10">
        <h2 className="text-3xl font-semibold text-primary mb-3 animate-fade-in-up">
          {title}
        </h2>
        <p className="text-base-content/70 text-lg animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default AuthImagePattern;
