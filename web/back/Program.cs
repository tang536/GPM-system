using System.Text;
using back;
using back.Data;
using back.Filters;
using back.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// ---------- 数据库（Pomelo MySQL 驱动，报告 5.1 节：MySqlConnector 连接池） ----------
var conn = builder.Configuration.GetConnectionString("Grad")?? throw new InvalidOperationException("缺少数据库连接串 ConnectionStrings:Grad");
builder.Services.AddDbContext<GradDb>(opt => opt.UseMySql(conn, new MySqlServerVersion(new Version(8, 0, 35))));

// ---------- 认证与授权 ----------
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o => {
        // 不做入站声明映射：令牌里的 uid/utype/roles/perm 等短键保持原样，
        // 否则 "roles" 会被改写成标准角色声明，导致按自定义键读取角色失败
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = System.Security.Claims.ClaimTypes.Name,
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddControllers(o => o.Filters.Add<DbErrorFilter>()).AddJsonOptions(o => {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
    });

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<LogService>();
builder.Services.AddScoped<ScopeService>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddOpenApi();

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5080", "http://127.0.0.1:5080").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment()) app.MapOpenApi();

// 上传的材料目录：固定到项目根目录下的 uploads，避免放在 bin/Debug 里被构建清理掉
var uploadRoot = UploadPaths.Root;

app.MapControllers();

// 前端构建产物（vite build --outDir ../back/wwwroot）
app.UseDefaultFiles();
app.UseStaticFiles();
// 上传的材料文件：/uploads/xxx.pdf 直接可访问（供材料下载与在线预览）
app.UseStaticFiles(new StaticFileOptions
{
    RequestPath = "/uploads",
    FileProvider = new PhysicalFileProvider(uploadRoot),
    ServeUnknownFileTypes = false,
});
app.MapFallback(async ctx =>
{
    if (ctx.Request.Path.StartsWithSegments("/api"))
    {
        ctx.Response.StatusCode = StatusCodes.Status404NotFound;
        await ctx.Response.WriteAsJsonAsync(new { error = "接口不存在" });
        return;
    }
    var index = Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "index.html");
    if (File.Exists(index))
    {
        ctx.Response.ContentType = "text/html; charset=utf-8";
        await ctx.Response.SendFileAsync(index);
    }
    else
    {
        ctx.Response.StatusCode = StatusCodes.Status404NotFound;
        await ctx.Response.WriteAsync("前端尚未构建：请在 front 目录执行 npm run build");
    }
});

app.Run();
