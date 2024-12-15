'use client';

import { motion } from 'framer-motion';
import { Database, Code, Table, Filter, LucideProps } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

const FeatureCard = ({ icon: Icon, title, description }: { icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>, title: string, description: string }) => (
  <motion.div
    className="bg-[#12141a] p-6 rounded-lg border border-gray-800"
    whileHover={{ scale: 1.05 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <Icon className="w-12 h-12 mb-4 text-blue-500" />
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </motion.div>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white">
      <main className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold mb-4">SQLite Viewer</h1>
          <p className="text-xl text-gray-400 mb-8">Explore and analyze your SQLite databases with ease</p>
          <Link href="/editor">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Launch SQLite Viewer
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          <FeatureCard
            icon={Database}
            title="Database Upload"
            description="Easily upload and explore your SQLite database files"
          />
          <FeatureCard
            icon={Table}
            title="Table View"
            description="Browse through tables and their contents effortlessly"
          />
          <FeatureCard
            icon={Filter}
            title="Advanced Filtering"
            description="Filter and search your data with powerful query options"
          />
          <FeatureCard
            icon={Code}
            title="Custom Queries"
            description="Execute custom SQL queries for in-depth analysis"
          />
        </motion.div>
      </main>
    </div>
  );
}

