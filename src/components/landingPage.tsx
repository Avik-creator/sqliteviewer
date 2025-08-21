"use client";

import { motion } from "framer-motion";
import {
  Database,
  Code,
  Table,
  Filter,
  Search,
  Download,
  ArrowRight,
  CheckCircle,
  type LightbulbIcon as LucideProps,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: ForwardRefExoticComponent<
    Omit<typeof LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  title: string;
  description: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    viewport={{ once: true }}
  >
    <Card className="h-full border-border/50 hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-serif text-lg font-semibold">{title}</h3>
        </div>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  </motion.div>
);

const DatabaseTypeCard = ({
  type,
  color,
  description,
}: {
  type: string;
  color: string;
  description: string;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    viewport={{ once: true }}
    className="text-center"
  >
    <div
      className={`w-16 h-16 mx-auto mb-3 rounded-full ${color} flex items-center justify-center`}
    >
      <Database className="w-8 h-8 text-white" />
    </div>
    <h4 className="font-serif font-semibold mb-1">{type}</h4>
    <p className="text-sm text-muted-foreground">{description}</p>
  </motion.div>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 py-20 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge
              variant="secondary"
              className="mb-6 bg-primary/10 text-primary border-primary/20"
            >
              Professional Database Management
            </Badge>
            <h1 className="font-serif text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Database Viewer Pro
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
              Connect, explore, and analyze your databases with a modern,
              professional interface. Support for PostgreSQL, MySQL, and SQLite
              with advanced filtering and export capabilities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/editor">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground group"
                >
                  Launch Database Viewer
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" size="lg">
                View Documentation
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Database Support Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-serif text-3xl font-bold mb-4">
              Multi-Database Support
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Connect to your favorite databases with native support and
              optimized performance
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <DatabaseTypeCard
              type="PostgreSQL"
              color="bg-blue-500"
              description="Advanced relational database with powerful features"
            />
            <DatabaseTypeCard
              type="MySQL"
              color="bg-orange-500"
              description="Popular open-source database management system"
            />
            <DatabaseTypeCard
              type="SQLite"
              color="bg-green-500"
              description="Lightweight, file-based database solution"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to explore, analyze, and manage your database
              data efficiently
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <FeatureCard
              icon={Database}
              title="Connection Management"
              description="Easily manage multiple database connections with secure credential storage and connection testing"
            />
            <FeatureCard
              icon={Table}
              title="Advanced Table Viewer"
              description="Browse tables with sorting, filtering, and pagination. View data types and handle large datasets efficiently"
            />
            <FeatureCard
              icon={Search}
              title="Global Search & Filtering"
              description="Search across all columns and apply advanced filters to find exactly what you're looking for"
            />
            <FeatureCard
              icon={Code}
              title="SQL Query Editor"
              description="Execute custom SQL queries with syntax highlighting and error handling for complex analysis"
            />
            <FeatureCard
              icon={Download}
              title="Data Export"
              description="Export your data in multiple formats including CSV and JSON with flexible selection options"
            />
            <FeatureCard
              icon={Filter}
              title="Smart Data Types"
              description="Automatic data type detection with appropriate formatting and validation for different data types"
            />
          </div>

          {/* Benefits Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-card border rounded-lg p-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="font-serif text-2xl font-bold mb-4">
                  Why Choose Database Viewer Pro?
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span>
                      Professional-grade interface designed for productivity
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span>Support for multiple database types in one tool</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span>Advanced filtering and search capabilities</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span>Secure connection management with testing</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span>Export data in multiple formats</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
                  <Database className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h4 className="font-serif text-lg font-semibold mb-2">
                    Ready to Get Started?
                  </h4>
                  <p className="text-muted-foreground mb-4">
                    Connect to your database and start exploring your data today
                  </p>
                  <Link href="/editor">
                    <Button className="bg-primary hover:bg-primary/90">
                      Launch Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h3 className="font-serif text-lg font-semibold mb-2">
              Database Viewer Pro
            </h3>
            <p className="text-sm text-muted-foreground">
              Professional database management made simple and efficient
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
